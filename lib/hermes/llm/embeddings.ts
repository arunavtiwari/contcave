import "server-only";

/**
 * Text embeddings over CreativeFingerprint.summaryText (voyage-3 by default).
 * Dimension must match VECTOR_DIMENSIONS in lib/hermes/vector.ts and the
 * Atlas index definition.
 *
 * PHASE 1 — not called anywhere in Phase 0.
 * Env: EMBEDDINGS_API_KEY, EMBEDDINGS_MODEL.
 */

export async function embedText(_text: string): Promise<number[]> {
    throw new Error("Not implemented — production agent Phase 1");
}
