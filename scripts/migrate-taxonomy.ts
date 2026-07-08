/**
 * One-time migration script: populate taxonomy axes on existing listings.
 *
 * What it does:
 *   1. Maps Listing.category → Listing.venueTypes (axis 2)
 *   2. Normalises Listing.type labels to the current axis-1 vocabulary
 *   3. Handles the Cyclorama Studio special case (sets setFeatures on the listing)
 *   4. For listings with sets, propagates the same setFeatures as defaults per set
 *      (owners can refine per-set values afterwards)
 *
 * Run once with: npx tsx scripts/migrate-taxonomy.ts
 */

import { PrismaClient } from "@prisma/client";

import { CATEGORY_TO_VENUE_TYPES, normaliseUseCase } from "../lib/taxonomy";

const prisma = new PrismaClient();

async function main() {
    console.warn("Starting taxonomy migration…");

    const listings = await prisma.listing.findMany({
        select: { id: true, category: true, type: true, venueTypes: true, hasSets: true },
    });

    console.warn(`Found ${listings.length} listings to migrate`);

    let updated = 0;
    let skipped = 0;

    for (const listing of listings) {
        const categoryMapping = CATEGORY_TO_VENUE_TYPES[listing.category] ?? null;

        // Only migrate if venueTypes is empty (don't overwrite manual edits)
        const shouldMigrateVenueTypes = listing.venueTypes.length === 0 && categoryMapping;
        const newVenueTypes = shouldMigrateVenueTypes ? categoryMapping!.venueTypes : listing.venueTypes;
        const newSetFeatures = shouldMigrateVenueTypes && categoryMapping?.setFeatures ? categoryMapping!.setFeatures : [];

        // Normalise type labels (axis 1)
        const rawTypes = (listing.type as string[]) || [];
        const normalisedTypes = Array.from(
            new Set(rawTypes.map(normaliseUseCase).filter((t): t is string => t !== null))
        );

        if (!shouldMigrateVenueTypes && rawTypes.join(",") === normalisedTypes.join(",")) {
            skipped++;
            continue;
        }

        await prisma.listing.update({
            where: { id: listing.id },
            data: {
                venueTypes: newVenueTypes,
                setFeatures: newSetFeatures,
                type: normalisedTypes,
            },
        });

        // If there are sets but no per-set setFeatures yet, seed them with the listing-level value
        if (listing.hasSets && newSetFeatures.length > 0) {
            const sets = await prisma.listingSet.findMany({
                where: { listingId: listing.id, setFeatures: { isEmpty: true } },
                select: { id: true },
            });
            if (sets.length > 0) {
                await prisma.listingSet.updateMany({
                    where: { id: { in: sets.map((s) => s.id) } },
                    data: { setFeatures: newSetFeatures },
                });
            }
        }

        updated++;
        if (updated % 50 === 0) console.warn(`  … ${updated} listings updated`);
    }

    console.warn(`\nMigration complete. Updated: ${updated}, Skipped: ${skipped}`);
}

main()
    .catch((e) => {
        console.error("Migration failed:", e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
