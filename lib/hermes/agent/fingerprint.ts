import "server-only";

import { type CreativeFingerprintInput,creativeFingerprintSchema } from "@/schemas/production";

import { complete } from "../llm/anthropic";

/**
 * Agent step 1 — Fingerprint (multimodal, reasoning tier).
 * Reduces a moodboard/brief (or a portfolio/listing asset at ingestion) to a
 * CreativeFingerprint whose summaryText is embedded for matching
 * (fingerprint-as-text — no image-embedding pipeline in MVP).
 * Callers must cache: never re-fingerprint the same asset.
 */

export type FingerprintInput = {
    briefText?: string;
    imageUrls: string[];
};

const SYSTEM = `You are ContCave's creative analyst. You look at reference images
(and optional brief text) for a commercial photo/video shoot and reduce them to
a structured creative fingerprint. Be concrete and use working-photographer
vocabulary. Return ONLY valid JSON matching:
{
  "lighting": string[],      // e.g. ["soft","natural","north window"]
  "palette": string[],       // e.g. ["earthy","warm neutral"]
  "composition": string[],   // e.g. ["negative space","centered","flat lay"]
  "mood": string[],          // e.g. ["calm","premium"]
  "productCategory": string, // optional, e.g. "skincare"
  "summaryText": string      // ONE dense paragraph a producer could match suppliers with
}
No prose, no markdown fences.`;

function extractJson(raw: string): unknown {
    const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error("Fingerprint response contained no JSON");
    return JSON.parse(trimmed.slice(start, end + 1));
}

export async function fingerprint(input: FingerprintInput): Promise<CreativeFingerprintInput> {
    if (!input.imageUrls.length && !input.briefText) {
        throw new Error("fingerprint() needs images or brief text");
    }

    const prompt = input.briefText
        ? `Brief text:\n${input.briefText}\n\nFingerprint the brief${input.imageUrls.length ? " and the attached reference images" : ""}.`
        : "Fingerprint the attached reference images.";

    const raw = await complete("reasoning", {
        system: SYSTEM,
        prompt,
        imageUrls: input.imageUrls,
        maxTokens: 1000,
    });

    return creativeFingerprintSchema.parse(extractJson(raw));
}
