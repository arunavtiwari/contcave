import "server-only";

import { SEARCH_CONFIG } from "@/lib/search/config";

import { acquireAiSlot, tripBreaker } from "./breaker";

export const EMBEDDING_MODEL = SEARCH_CONFIG.ai.models.embedding;

const BYTES_PER_FLOAT = 4;

export const embeddingsConfigured = () =>
    Boolean(process.env.CLOUDFLARE_AI_API_TOKEN && process.env.CLOUDFLARE_R2_ACCOUNT_ID);

function normalize(values: number[]) {
    const norm = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0)) || 1;
    return Float32Array.from(values, (value) => value / norm);
}

export const vectorToBytes = (vector: Float32Array) => new Uint8Array(new Float32Array(vector).buffer);

export function bytesToVector(bytes: Uint8Array) {
    const copy = new Uint8Array(bytes);
    return new Float32Array(copy.buffer, 0, Math.floor(copy.byteLength / BYTES_PER_FLOAT));
}

export async function embedTexts(texts: string[], timeoutMs: number): Promise<Float32Array[]> {
    if (!embeddingsConfigured() || !acquireAiSlot(EMBEDDING_MODEL, SEARCH_CONFIG.ai.embedPerMinute)) throw new Error("Embeddings unavailable");

    const url = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_R2_ACCOUNT_ID}/ai/run/${EMBEDDING_MODEL}`;
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.CLOUDFLARE_AI_API_TOKEN}` },
        body: JSON.stringify({ text: texts }),
        signal: AbortSignal.timeout(timeoutMs),
        cache: "no-store",
    });

    if (response.status === 429) {
        tripBreaker(EMBEDDING_MODEL);
        throw new Error("Embeddings rate limited");
    }
    const payload = await response.json().catch(() => null) as { result?: { data?: number[][]; response?: number[][] } } | null;
    const vectors = payload?.result?.data ?? payload?.result?.response;
    if (!response.ok || !Array.isArray(vectors) || vectors.length !== texts.length) {
        throw new Error(`Embeddings failed with ${response.status}`);
    }
    return vectors.map(normalize);
}
