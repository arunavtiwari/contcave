import "server-only";

import prisma from "@/lib/prismadb";

import { embedText } from "../llm/embeddings";
import { vectorSearch } from "../vector";

/**
 * Agent step 2 — Retrieve (deterministic).
 * Embed the brief's fingerprint summary, $vectorSearch over
 * Crew/Talent/ListingCreativeProfile embeddings pre-filtered by city + rate
 * share of budget, drop date-blocked entities, return top-K with scores.
 */

export type RetrievedCandidates = {
    studios: { listingId: string; score: number }[];
    crew: { crewId: string; role: string; score: number }[];
    talent: { talentId: string; score: number }[];
};

// Rough per-category share of the brief budget used as a rate pre-filter.
const CREW_BUDGET_SHARE = 0.35;
const TALENT_BUDGET_SHARE = 0.35;

export async function retrieveCandidates(
    briefId: string,
    topK = 8
): Promise<RetrievedCandidates> {
    const brief = await prisma.brief.findUnique({ where: { id: briefId } });
    if (!brief) throw new Error("Brief not found");

    // Query vector: cached moodboard embedding, else embed what we have.
    const queryVector = brief.moodboardEmbedding.length
        ? brief.moodboardEmbedding
        : await embedText(
              brief.moodboardFingerprint?.summaryText ??
                  `${brief.moodWords.join(", ")}. ${brief.notes ?? ""}`
          );

    const [studioHits, crewHits, talentHits] = await Promise.all([
        vectorSearch("ListingCreativeProfile", queryVector, {}, topK * 2),
        vectorSearch(
            "Crew",
            queryVector,
            { city: brief.city, maxDayRateInr: Math.round(brief.budgetInr * CREW_BUDGET_SHARE) },
            topK
        ),
        vectorSearch(
            "Talent",
            queryVector,
            { city: brief.city, maxDayRateInr: Math.round(brief.budgetInr * TALENT_BUDGET_SHARE) },
            topK
        ),
    ]);

    // Studio profiles carry no city — restrict to active verified listings in the brief city.
    const profileListingIds = studioHits.map((h) => String(h.doc.listingId));
    const cityListings = await prisma.listing.findMany({
        where: {
            id: { in: profileListingIds },
            active: true,
            status: "VERIFIED",
            locationValue: { contains: brief.city, mode: "insensitive" },
        },
        select: { id: true },
    });
    const cityIds = new Set(cityListings.map((l) => l.id));

    // Availability: drop crew/talent with a blocked date overlapping the brief.
    const blocked = await prisma.productionAvailability.findMany({
        where: {
            entityId: { in: [...crewHits.map((h) => h.id), ...talentHits.map((h) => h.id)] },
        },
    });
    const isBlocked = (entityId: string) =>
        blocked.some(
            (a) => a.entityId === entityId && a.blockedDates.some((d) => brief.dates.includes(d))
        );

    return {
        studios: studioHits
            .filter((h) => cityIds.has(String(h.doc.listingId)))
            .slice(0, topK)
            .map((h) => ({ listingId: String(h.doc.listingId), score: h.score })),
        crew: crewHits
            .filter((h) => !isBlocked(h.id))
            .map((h) => ({ crewId: h.id, role: String(h.doc.role ?? ""), score: h.score })),
        talent: talentHits
            .filter((h) => !isBlocked(h.id))
            .map((h) => ({ talentId: h.id, score: h.score })),
    };
}
