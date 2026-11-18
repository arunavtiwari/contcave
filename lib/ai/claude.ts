import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { jsonSchemaOutputFormat } from "@anthropic-ai/sdk/helpers/json-schema";
import { z } from "zod";

/** The one model behind every AI feature (Spot, AI search, plans). Change it here to move them all. */
export const CLAUDE_MODEL = "claude-haiku-5-5";

/**
 * Effort trades thoroughness for speed and cost. Every current job (chat turns, query parsing,
 * one-line reasons, short plans) does well at "low".
 */
export type ClaudeEffort = "low" | "medium" | "high";

/** Raised when AI can't be used right now (no key, refused); callers fall back to rules or templates. */
export class AiUnavailableError extends Error {}

export const claudeConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY);

let client: Anthropic | null = null;

/** The shared client. The SDK retries 408/409/429/5xx and connection errors with backoff. */
export function claudeClient(): Anthropic {
    if (!claudeConfigured()) throw new AiUnavailableError("ANTHROPIC_API_KEY is not set");
    return (client ??= new Anthropic());
}

type JsonRequest = {
    label: string;
    system: string;
    input: string;
    /** Shapes the reply; the caller still validates it (e.g. clamping values the schema can't express). */
    schema: z.ZodType;
    maxTokens: number;
    /** Per attempt; one retry at most, so the worst case stays near twice this. */
    timeoutMs: number;
    effort?: ClaudeEffort;
};

type ObjectJsonSchema = Parameters<typeof jsonSchemaOutputFormat>[0];

/**
 * The schema as plain JSON Schema. Structured outputs can't enforce refinements or ranges, so the
 * SDK drops those keywords and callers keep their own (lenient) validation of the reply.
 */
const outputSchema = (schema: z.ZodType) =>
    z.toJSONSchema(schema, { io: "input", unrepresentable: "any" }) as ObjectJsonSchema;

/** One JSON reply shaped by `schema`; returned unvalidated for the caller's own checks. */
export async function generateClaudeJson(request: JsonRequest): Promise<unknown> {
    const response = await claudeClient().messages.parse(
        {
            model: CLAUDE_MODEL,
            max_tokens: request.maxTokens,
            system: request.system,
            messages: [{ role: "user", content: request.input }],
            output_config: { effort: request.effort ?? "low", format: jsonSchemaOutputFormat(outputSchema(request.schema)) },
        },
        { timeout: request.timeoutMs, maxRetries: 1 },
    );
    if (response.stop_reason === "refusal") throw new AiUnavailableError(`Claude ${request.label}: request declined`);
    if (response.parsed_output == null) throw new Error(`Claude ${request.label}: no structured output (stop: ${response.stop_reason})`);
    return response.parsed_output as unknown;
}
