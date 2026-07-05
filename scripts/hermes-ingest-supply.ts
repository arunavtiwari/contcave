/* eslint-disable no-console */
/**
 * Backfill Hermes fingerprints + embeddings for the existing supply graph:
 * verified listings (studios) and any crew/talent with portfolios.
 * Cache-respecting — already-fingerprinted records are skipped, so it is safe
 * to re-run and only pays for new assets.
 *
 * Run: npx tsx scripts/hermes-ingest-supply.ts [--limit N]
 * Needs: DATABASE_URL, ANTHROPIC_API_KEY, EMBEDDINGS_API_KEY.
 */

import { PrismaClient } from "@prisma/client";

import {
    ingestCrewPortfolio,
    ingestListing,
    ingestTalentPortfolio,
} from "../lib/hermes/agent/ingest";

const prisma = new PrismaClient();

async function main() {
    const limitArg = process.argv.indexOf("--limit");
    const limit = limitArg > -1 ? Number(process.argv[limitArg + 1]) : 50;

    const listings = await prisma.listing.findMany({
        where: { active: true, status: "VERIFIED" },
        select: { id: true, title: true },
        take: limit,
    });
    console.log(`Ingesting up to ${listings.length} listings…`);
    for (const l of listings) {
        try {
            await ingestListing(l.id);
            console.log(`  ✓ ${l.title}`);
        } catch (e) {
            console.error(`  ✗ ${l.title}:`, e instanceof Error ? e.message : e);
        }
    }

    const crew = await prisma.crew.findMany({ select: { id: true, name: true } });
    for (const c of crew) {
        try {
            await ingestCrewPortfolio(c.id);
            console.log(`  ✓ crew ${c.name}`);
        } catch (e) {
            console.error(`  ✗ crew ${c.name}:`, e instanceof Error ? e.message : e);
        }
    }

    const talent = await prisma.talent.findMany({ select: { id: true, name: true } });
    for (const t of talent) {
        try {
            await ingestTalentPortfolio(t.id);
            console.log(`  ✓ talent ${t.name}`);
        } catch (e) {
            console.error(`  ✗ talent ${t.name}:`, e instanceof Error ? e.message : e);
        }
    }

    console.log("Done. Run `npm run hermes:indexes` once so $vectorSearch can use these.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
