import "server-only";

/**
 * Text embeddings over CreativeFingerprint.summaryText (Voyage, voyage-3 =
 * 1024 dims). Dimension must match VECTOR_DIMENSIONS in lib/hermes/vector.ts
 * and the Atlas index definition.
 *
 * Env: EMBEDDINGS_API_KEY, EMBEDDINGS_MODEL (default voyage-3).
 */

export async function embedText(text: string): Promise<number[]> {
    const apiKey = process.env.EMBEDDINGS_API_KEY;
    if (!apiKey) throw new Error("EMBEDDINGS_API_KEY is not set");
    const model = process.env.EMBEDDINGS_MODEL ?? "voyage-3";

    const res = await fetch("https://api.voyageai.com/v1/embeddings", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ model, input: [text.slice(0, 8000)] }),
    });

    if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Voyage API ${res.status}: ${body.slice(0, 300)}`);
    }

    const data = (await res.json()) as { data?: { embedding?: number[] }[] };
    const embedding = data.data?.[0]?.embedding;
    if (!embedding?.length) throw new Error("Voyage API returned no embedding");
    return embedding;
}
