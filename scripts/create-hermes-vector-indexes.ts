/* eslint-disable no-console */
/**
 * Create Atlas Vector Search indexes for the Hermes supply graph.
 * Requires an Atlas M10+ cluster ($vectorSearch is not available on shared
 * tiers or local mongod). Indexes stay empty until Phase 1 populates the
 * embedding fields.
 *
 * Run: npx tsx scripts/create-hermes-vector-indexes.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DIMENSIONS = 1024; // voyage-3 — keep in sync with lib/hermes/vector.ts
const INDEX_NAME = "production_fingerprint_vector";

const targets: { collection: string; path: string; filters: string[] }[] = [
    { collection: "Crew", path: "embedding", filters: ["city", "serviceableCities", "dayRateInr"] },
    { collection: "Talent", path: "embedding", filters: ["city", "serviceableCities", "dayRateInr"] },
    { collection: "ListingCreativeProfile", path: "embedding", filters: ["listingId"] },
    { collection: "Brief", path: "moodboardEmbedding", filters: ["city", "status"] },
];

async function main() {
    for (const t of targets) {
        const definition = {
            fields: [
                { type: "vector", path: t.path, numDimensions: DIMENSIONS, similarity: "cosine" },
                ...t.filters.map((path) => ({ type: "filter", path })),
            ],
        };
        try {
            await prisma.$runCommandRaw({
                createSearchIndexes: t.collection,
                indexes: [{ name: INDEX_NAME, type: "vectorSearch", definition }],
            });
            console.log(`created ${INDEX_NAME} on ${t.collection}.${t.path}`);
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            if (/already exists|Duplicate/i.test(msg)) {
                console.log(`exists  ${INDEX_NAME} on ${t.collection}`);
            } else {
                throw e;
            }
        }
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
