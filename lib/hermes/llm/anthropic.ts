import "server-only";

/**
 * Model-tier wrapper for the Anthropic Messages API (production agent).
 * Reasoning tier: moodboard understanding, plan composition.
 * Utility tier: tag normalisation, short classification.
 *
 * PHASE 1+ — not called anywhere in Phase 0.
 * Env: ANTHROPIC_API_KEY, ANTHROPIC_MODEL_REASONING, ANTHROPIC_MODEL_UTILITY.
 */

export type ModelTier = "reasoning" | "utility";

export type LlmRequest = {
    system: string;
    prompt: string;
    imageUrls?: string[];
    maxTokens?: number;
};

export function modelForTier(tier: ModelTier): string {
    const model =
        tier === "reasoning"
            ? process.env.ANTHROPIC_MODEL_REASONING
            : process.env.ANTHROPIC_MODEL_UTILITY;
    if (!model) throw new Error(`ANTHROPIC_MODEL_${tier.toUpperCase()} is not set`);
    return model;
}

export async function complete(_tier: ModelTier, _req: LlmRequest): Promise<string> {
    throw new Error("Not implemented — production agent Phase 1");
}
