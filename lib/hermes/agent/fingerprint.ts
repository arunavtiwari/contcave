import "server-only";

import type { CreativeFingerprintInput } from "@/schemas/production";

/**
 * Agent step 1 — Fingerprint (multimodal, reasoning tier).
 * Reduces a moodboard/brief (or a portfolio asset at ingestion) to a
 * CreativeFingerprint whose summaryText is embedded for matching
 * (fingerprint-as-text, no image-embedding pipeline in MVP).
 * Never re-fingerprint the same asset — cache at ingestion.
 *
 * PHASE 1 — stub only. See docs/production-agent.md.
 */

export type FingerprintInput = {
    briefText?: string;
    imageUrls: string[];
};

export async function fingerprint(_input: FingerprintInput): Promise<CreativeFingerprintInput> {
    throw new Error("Not implemented — production agent Phase 1");
}
