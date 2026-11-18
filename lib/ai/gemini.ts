import "server-only";

import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { z } from "zod";

import { acquireAiSlot, fastestFirst, recordLatency, tripBreaker } from "./breaker";

const DAILY_QUOTA_PAUSE_MS = 60 * 60_000;
const RETRYABLE_STATUS = new Set([429, 500, 503, 504]);
const SUPPORTED_SCHEMA_KEYS = new Set([
    "type",
    "properties",
    "required",
    "items",
    "enum",
    "anyOf",
    "additionalProperties",
    "description",
]);

export { ThinkingLevel };

export class AiUnavailableError extends Error {}

export class GeminiTimeoutError extends Error {
    readonly status = 504;
}

export type GeminiModelPolicy = {
    models: readonly string[];
    perModelPerMinute: number;
    order: "listed" | "fastest";
};

export const geminiConfigured = () => Boolean(process.env.GEMINI_API_KEY);

let client: GoogleGenAI | null = null;
export const geminiClient = () => (client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }));

function pruneSchema(node: unknown): unknown {
    if (Array.isArray(node)) return node.map(pruneSchema);
    if (!node || typeof node !== "object") return node;
    return Object.fromEntries(
        Object.entries(node)
            .filter(([key]) => SUPPORTED_SCHEMA_KEYS.has(key))
            .map(([key, value]) => [key, key === "properties"
                ? Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([name, child]) => [name, pruneSchema(child)]))
                : pruneSchema(value)]),
    );
}

export const toGeminiSchema = (schema: z.ZodType) => pruneSchema(z.toJSONSchema(schema, { io: "input", unrepresentable: "any" }));

export function quotaPauseMs(message: string): number | undefined {
    if (/per ?day/i.test(message)) return DAILY_QUOTA_PAUSE_MS;
    const seconds = Number.parseFloat(/"retryDelay":\s*"([\d.]+)s"/.exec(message)?.[1] ?? "");
    return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : undefined;
}

function statusOf(error: unknown): number | undefined {
    const status = error && typeof error === "object" && "status" in error ? error.status : undefined;
    return typeof status === "number" ? status : undefined;
}

export async function withGeminiModels<T>(label: string, policy: GeminiModelPolicy, run: (model: string) => Promise<T>): Promise<T> {
    if (!geminiConfigured()) throw new AiUnavailableError(`Gemini ${label}: GEMINI_API_KEY is not set`);
    const models = policy.order === "fastest" ? fastestFirst(policy.models) : policy.models;

    for (const model of models) {
        if (!acquireAiSlot(model, policy.perModelPerMinute)) continue;
        const startedAt = Date.now();
        try {
            const result = await run(model);
            recordLatency(model, Date.now() - startedAt);
            return result;
        } catch (error) {
            recordLatency(model, Date.now() - startedAt);
            const status = statusOf(error);
            if (status === undefined || !RETRYABLE_STATUS.has(status)) throw error;
            if (status === 429) tripBreaker(model, quotaPauseMs(error instanceof Error ? error.message : ""));
            console.warn(`[gemini] ${label} on ${model} failed with ${status}; trying the next model`);
        }
    }
    throw new AiUnavailableError(`Gemini ${label}: no model available`);
}

type JsonThinkingLevel = "minimal" | "low" | "medium" | "high";

export type GeminiJsonRequest = {
    label: string;
    policy: GeminiModelPolicy;
    system: string;
    input: string;
    schema: unknown;
    timeoutMs: number;
    maxOutputTokens?: number;
    thinkingLevel?: JsonThinkingLevel;
};

export async function generateGeminiJson(request: GeminiJsonRequest): Promise<unknown> {
    return withGeminiModels(request.label, request.policy, async (model) => {
        const interaction = await geminiClient().interactions.create(
            {
                model,
                system_instruction: request.system,
                input: request.input,
                generation_config: {
                    thinking_level: request.thinkingLevel ?? "minimal",
                    ...(request.maxOutputTokens ? { max_output_tokens: request.maxOutputTokens } : {}),
                },
                response_format: { type: "text", mime_type: "application/json", schema: request.schema },
                store: false,
            },
            { timeout: request.timeoutMs, maxRetries: 0 },
        );
        return JSON.parse(interaction.output_text ?? "");
    });
}
