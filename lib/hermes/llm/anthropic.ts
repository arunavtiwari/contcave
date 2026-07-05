import "server-only";

/**
 * Model-tier wrapper for the Anthropic Messages API (Hermes).
 * Reasoning tier: moodboard understanding, plan composition.
 * Utility tier: tag normalisation, short classification.
 * Plain fetch — no SDK dependency; images are passed by URL.
 *
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

type ContentBlock =
    | { type: "text"; text: string }
    | { type: "image"; source: { type: "url"; url: string } };

export async function complete(tier: ModelTier, req: LlmRequest): Promise<string> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");

    const content: ContentBlock[] = [
        ...(req.imageUrls ?? []).slice(0, 8).map(
            (url): ContentBlock => ({ type: "image", source: { type: "url", url } })
        ),
        { type: "text", text: req.prompt },
    ];

    const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
            model: modelForTier(tier),
            max_tokens: req.maxTokens ?? 1500,
            system: req.system,
            messages: [{ role: "user", content }],
        }),
    });

    if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Anthropic API ${res.status}: ${body.slice(0, 300)}`);
    }

    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    const text = data.content?.find((b) => b.type === "text")?.text;
    if (!text) throw new Error("Anthropic API returned no text content");
    return text;
}
