import { compareStudios, distanceStep } from "@/lib/listing/ranking";
import { SEARCH_CONFIG } from "@/lib/search/config";
import type { ScoredCandidate } from "@/lib/search/types";

export type Exclusion = "crew" | "date" | "budget";

export type Evaluated = ScoredCandidate & { excludedBy: Exclusion | null };

const ranked = ({ candidate, facts }: Evaluated) => ({
    distanceKm: facts.distanceKm,
    listingType: candidate.listingType,
    photoCount: candidate.imageSrc.length,
    avgReviewRating: candidate.avgReviewRating,
    reviewCount: candidate.reviewCount,
});

const fitsRequest = (entry: Evaluated) => (entry.score >= SEARCH_CONFIG.goodScore ? 0 : 1);

export const byRank = (a: Evaluated, b: Evaluated) =>
    fitsRequest(a) - fitsRequest(b)
    || distanceStep(a.facts.distanceKm) - distanceStep(b.facts.distanceKm)
    || b.score - a.score
    || compareStudios(ranked(a), ranked(b))
    || (a.candidate.id < b.candidate.id ? -1 : a.candidate.id > b.candidate.id ? 1 : 0);

const FALLBACK_ORDER: Record<Exclusion, (a: Evaluated, b: Evaluated) => number> = {
    budget: (a, b) => (a.facts.offer.total ?? Number.MAX_SAFE_INTEGER) - (b.facts.offer.total ?? Number.MAX_SAFE_INTEGER),
    crew: (a, b) => (b.candidate.maximumPax ?? 0) - (a.candidate.maximumPax ?? 0),
    date: byRank,
};

const fallbackOrder = (pool: Evaluated[]) =>
    [...pool].sort((a, b) => (a.excludedBy && a.excludedBy === b.excludedBy ? FALLBACK_ORDER[a.excludedBy](a, b) : byRank(a, b)));

export function selectResults(evaluated: Evaluated[]) {
    const eligible = evaluated.filter((entry) => !entry.excludedBy).sort(byRank).slice(0, SEARCH_CONFIG.maxResults);
    const fallback = eligible.length < SEARCH_CONFIG.closestFallbackCount
        ? fallbackOrder(evaluated.filter((entry) => entry.excludedBy && entry.candidate.listingType !== "CURATED"))
            .slice(0, SEARCH_CONFIG.closestFallbackCount - eligible.length)
        : [];
    return { eligible, fallback };
}
