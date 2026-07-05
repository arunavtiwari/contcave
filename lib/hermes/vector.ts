import "server-only";

import prisma from "@/lib/prismadb";

/**
 * Atlas $vectorSearch for the supply graph, executed through
 * prisma.$runCommandRaw so no separate MongoDB driver dependency is needed.
 * CRUD stays in Prisma; only similarity retrieval lives here.
 *
 * Indexes are created by scripts/create-production-vector-indexes.ts and stay
 * empty until Phase 1 populates the embedding fields.
 */

export const VECTOR_INDEX_NAME = "production_fingerprint_vector";
export const VECTOR_DIMENSIONS = 1024; // voyage-3 — keep in sync with the index script

export type VectorCollection = "Crew" | "Talent" | "ListingCreativeProfile";

export type VectorCandidate = {
    id: string;
    score: number;
    doc: Record<string, unknown>;
};

export type VectorSearchFilters = {
    city?: string; // matches `city` or `serviceableCities` (not applicable to ListingCreativeProfile)
    maxDayRateInr?: number;
};

export async function vectorSearch(
    collection: VectorCollection,
    queryVector: number[],
    filters: VectorSearchFilters,
    topK = 8
): Promise<VectorCandidate[]> {
    const filter: Record<string, unknown> = {};
    if (filters.city && collection !== "ListingCreativeProfile") {
        filter.$or = [{ city: filters.city }, { serviceableCities: filters.city }];
    }
    if (filters.maxDayRateInr != null && collection !== "ListingCreativeProfile") {
        filter.dayRateInr = { $lte: filters.maxDayRateInr };
    }

    const command = {
        aggregate: collection,
        pipeline: [
            {
                $vectorSearch: {
                    index: VECTOR_INDEX_NAME,
                    path: "embedding",
                    queryVector,
                    numCandidates: Math.max(topK * 15, 100),
                    limit: topK,
                    ...(Object.keys(filter).length ? { filter } : {}),
                },
            },
            { $addFields: { score: { $meta: "vectorSearchScore" } } },
        ],
        cursor: {},
    };

    const result = (await prisma.$runCommandRaw(
        command as unknown as Parameters<typeof prisma.$runCommandRaw>[0]
    )) as unknown as {
        cursor?: { firstBatch?: Array<Record<string, unknown> & { _id: { $oid: string }; score: number }> };
    };

    const batch = result.cursor?.firstBatch ?? [];
    return batch.map((doc) => ({
        id: doc._id.$oid,
        score: doc.score,
        doc,
    }));
}
