import { SEARCH_CONFIG } from "@/lib/search/config";
import type { ParsedQuery } from "@/schemas/search";

import type { Offer, ResultFacts, SearchCandidate } from "./types";

const RATING_FLOOR = 3;
const RATING_SPAN = 2;
const UNKNOWN_PRICE_SCORE = 0.3;

const clamp = (value: number) => Math.min(1, Math.max(0, value));

export function bayesianRating(average: number | null, count: number) {
    const { priorMean, priorWeight } = SEARCH_CONFIG.rating;
    const rated = typeof average === "number" && average > 0 && count > 0;
    const reviews = rated ? count : 0;
    return (priorWeight * priorMean + reviews * (rated ? average : priorMean)) / (priorWeight + reviews);
}

export function budgetTotal(parsed: ParsedQuery, hours: number) {
    if (parsed.budgetMax === null) return null;
    return parsed.budgetBasis === "hourly" ? Math.round(parsed.budgetMax * hours) : parsed.budgetMax;
}

export function overBudgetBy(parsed: ParsedQuery, offer: Offer) {
    const limit = budgetTotal(parsed, offer.hours);
    if (limit === null || offer.total === null) return null;
    return offer.total > limit ? offer.total - limit : 0;
}

function priceScore(parsed: ParsedQuery, offer: Offer, over: number | null) {
    if (parsed.budgetMax === null) return null;
    if (offer.total === null || over === null) return UNKNOWN_PRICE_SCORE;
    if (over === 0) return 1;
    const limit = budgetTotal(parsed, offer.hours) ?? 1;
    return clamp(1 - over / limit / SEARCH_CONFIG.budgetSoftOverRatio);
}

const distanceScore = (distanceKm: number | null) =>
    distanceKm === null ? null : 1 / (1 + distanceKm / SEARCH_CONFIG.distanceHalfScoreKm);

export function scoreResult(candidate: SearchCandidate, parsed: ParsedQuery, facts: ResultFacts, featureScore: number | null) {
    const weights = SEARCH_CONFIG.weights;
    const rating = clamp((bayesianRating(candidate.avgReviewRating, candidate.reviewCount) - RATING_FLOOR) / RATING_SPAN);
    const components: [number, number | null][] = [
        [weights.feature, featureScore],
        [weights.price, priceScore(parsed, facts.offer, facts.overBudgetBy)],
        [weights.shootType, facts.match.shootTypeFit],
        [weights.distance, distanceScore(facts.distanceKm)],
        [weights.rating, rating],
        [weights.instant, candidate.instantBooking ? 1 : 0],
    ];
    const present = components.filter((entry): entry is [number, number] => entry[1] !== null);
    const totalWeight = present.reduce((sum, [weight]) => sum + weight, 0);
    const base = totalWeight > 0 ? present.reduce((sum, [weight, value]) => sum + weight * value, 0) / totalWeight : 0;
    return clamp(base - facts.match.missingNeeds.length * SEARCH_CONFIG.missingNeedPenalty);
}
