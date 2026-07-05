import "server-only";

/**
 * Agent step 2 — Retrieve (deterministic).
 * Embed the brief's moodboard fingerprint summary, $vectorSearch over
 * Crew/Talent/ListingCreativeProfile embeddings (lib/hermes/vector.ts)
 * pre-filtered by city + rate share, drop date-blocked entities
 * (ProductionAvailability for crew/talent, DayStatus/ListingBlock for
 * studios), return top-K per category with similarity scores.
 *
 * PHASE 1 — stub only. See docs/production-agent.md.
 */

export type RetrievedCandidates = {
    studios: { listingId: string; score: number }[];
    crew: { crewId: string; role: string; score: number }[];
    talent: { talentId: string; score: number }[];
};

export async function retrieveCandidates(
    _briefId: string,
    _topK = 8
): Promise<RetrievedCandidates> {
    throw new Error("Not implemented — production agent Phase 1");
}
