import "server-only";

import { z } from "zod";

import { SEARCH_CONFIG } from "@/lib/search/config";

import { acquireAiSlot, fastestFirst, recordLatency, tripBreaker } from "./breaker";

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions";
const DAILY_QUOTA_BACKOFF_MS = 60 * 60_000;
const SUPPORTED_SCHEMA_KEYS = new Set([
    "type",
    "properties",
    "required",
    "items",
    "enum",
    "anyOf",
    "minItems",
    "maxItems",
    "minimum",
    "maximum",
    "additionalProperties",
    "description",
]);

type GeminiTask = "parse" | "reasons";

export const geminiConfigured = () => Boolean(process.env.GEMINI_API_KEY);

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

function retryDelayMs(payload: unknown, headers: Headers) {
    const error = (payload as { error?: { message?: string; details?: { retryDelay?: string }[] } } | null)?.error;
    if (/per ?day/i.test(error?.message ?? "")) return DAILY_QUOTA_BACKOFF_MS;
    const delay = error?.details?.find((detail) => detail.retryDelay)?.retryDelay ?? headers.get("retry-after") ?? "";
    const seconds = Number.parseFloat(delay);
    return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : undefined;
}

type InteractionStep = { type?: string; content?: { type?: string; text?: unknown }[] };

function outputText(payload: unknown) {
    const steps = (payload as { steps?: InteractionStep[] } | null)?.steps ?? [];
    return steps
        .filter((step) => step.type === "model_output")
        .flatMap((step) => step.content ?? [])
        .map((part) => part.text)
        .filter((text): text is string => typeof text === "string")
        .join("");
}

export class AiUnavailableError extends Error {}

export async function generateGeminiJson(
    task: GeminiTask,
    request: { system: string; input: string; schema: unknown; timeoutMs: number },
): Promise<unknown> {
    if (!geminiConfigured()) throw new AiUnavailableError(`Gemini ${task} unavailable`);

    for (const model of fastestFirst(SEARCH_CONFIG.ai.models.gemini)) {
        if (!acquireAiSlot(model, SEARCH_CONFIG.ai.perModelPerMinute)) continue;

        const startedAt = Date.now();
        const response = await fetch(ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY ?? "" },
            body: JSON.stringify({
                model,
                system_instruction: request.system,
                input: request.input,
                generation_config: { temperature: 0, thinking_level: "minimal" },
                response_format: { type: "text", mime_type: "application/json", schema: request.schema },
                store: false,
            }),
            signal: AbortSignal.timeout(request.timeoutMs),
            cache: "no-store",
        }).catch((error: unknown) => {
            recordLatency(model, request.timeoutMs);
            throw error;
        });
        recordLatency(model, Date.now() - startedAt);

        const payload: unknown = await response.json().catch(() => null);
        if (response.status === 429) {
            tripBreaker(model, retryDelayMs(payload, response.headers));
            continue;
        }
        if (!response.ok) throw new Error(`Gemini ${task} failed with ${response.status}: ${JSON.stringify(payload).slice(0, 300)}`);
        return JSON.parse(outputText(payload));
    }

    throw new AiUnavailableError(`Gemini ${task} unavailable`);
}
