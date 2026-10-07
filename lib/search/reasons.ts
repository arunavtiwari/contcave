import "server-only";

import { unstable_cache } from "next/cache";
import { z } from "zod";

import { AiUnavailableError, geminiConfigured, generateGeminiJson, toGeminiSchema } from "@/lib/search/ai/gemini";
import { SEARCH_CONFIG } from "@/lib/search/config";
import { isGroundedReason } from "@/lib/search/explain";
import type { ExplainableResult } from "@/lib/search/service";
import type { ParsedQuery } from "@/schemas/search";

const MAX_REASONS = 2;
const MAX_REASON_LENGTH = 70;

const reasonsSchema = z.object({
    results: z.array(z.object({
        id: z.string(),
        reasons: z.array(z.string().max(MAX_REASON_LENGTH)).max(MAX_REASONS),
    })),
});

const REASONS_SCHEMA = toGeminiSchema(reasonsSchema);

const REASONS_INSTRUCTIONS = [
    "You write one or two short reasons (at most eight words each) why each studio suits a customer's shoot.",
    "Use only the facts given for that studio. Never add numbers, features, prices, dates or availability that are not in its facts.",
    "Plain, specific language for Indian customers. No marketing words, no exclamation marks, no emojis.",
].join("\n");

type ReasonFacts = Record<string, unknown> & { id: string };

function factsFor(parsed: ParsedQuery, { candidate, facts }: ExplainableResult): ReasonFacts {
    return {
        id: candidate.id,
        studio: candidate.title,
        set: facts.match.setName,
        matchedFeatures: [...facts.match.matchedNeeds, ...facts.match.matchedVibes],
        listedForShootType: facts.match.shootTypeFit === 1 ? parsed.shootTypes[0] : null,
        fitsCrewOf: facts.crewFits ? parsed.crew : null,
        kmFromArea: parsed.area && facts.distanceKm !== null ? Number(facts.distanceKm.toFixed(1)) : null,
        area: parsed.area,
        withinBudget: facts.overBudgetBy === 0,
        rating: candidate.reviewCount ? candidate.avgReviewRating : null,
        reviews: candidate.reviewCount || null,
    };
}

async function writeWithAi(payload: string): Promise<Record<string, string[]>> {
    const raw = await generateGeminiJson("reasons", {
        system: REASONS_INSTRUCTIONS,
        input: payload,
        schema: REASONS_SCHEMA,
        timeoutMs: SEARCH_CONFIG.timeoutsMs.reasons,
    });
    const parsed = reasonsSchema.safeParse(raw);
    if (!parsed.success) throw new Error("Reasons response did not match the schema");
    return Object.fromEntries(parsed.data.results.map((result) => [result.id, result.reasons]));
}

const cachedReasons = unstable_cache(writeWithAi, [SEARCH_CONFIG.cacheVersion, "search-reasons"], { revalidate: SEARCH_CONFIG.cacheSeconds });

export async function writeAiReasons(parsed: ParsedQuery, results: ExplainableResult[], allowAi: boolean): Promise<Record<string, string[]>> {
    if (!allowAi || !results.length || !geminiConfigured()) return {};
    try {
        const written = await cachedReasons(JSON.stringify(results.map((result) => factsFor(parsed, result))));
        return Object.fromEntries(results.flatMap((result) => {
            const grounded = (written[result.id] ?? []).filter((reason) => isGroundedReason(reason, result.candidate, parsed, result.facts));
            return grounded.length ? [[result.id, grounded]] : [];
        }));
    } catch (error) {
        if (!(error instanceof AiUnavailableError)) console.error("[ai-search] AI reasons failed; keeping templates.", error);
        return {};
    }
}
