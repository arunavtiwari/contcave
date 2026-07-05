import "server-only";

import prisma from "@/lib/prismadb";
import type { CreativeFingerprintInput } from "@/schemas/production";

import { embedText } from "../llm/embeddings";
import { fingerprint } from "./fingerprint";

/**
 * Ingestion jobs: fingerprint + embed briefs, portfolios, and listings.
 * All are cache-respecting (skip anything already fingerprinted) and safe to
 * fire-and-forget — failures log and leave the record un-embedded, which the
 * retrieval layer treats as "no suggestion yet", never as an error.
 */

export async function ingestBrief(briefId: string): Promise<void> {
    const brief = await prisma.brief.findUnique({ where: { id: briefId } });
    if (!brief || brief.moodboardFingerprint) return; // cached

    const briefText = [
        `Deliverables: ${brief.deliverables.map((d) => `${d.qty}x ${d.type}`).join(", ")}.`,
        brief.moodWords.length ? `Mood words: ${brief.moodWords.join(", ")}.` : "",
        brief.notes ? `Notes: ${brief.notes}` : "",
    ]
        .filter(Boolean)
        .join(" ");

    const fp = await fingerprint({ briefText, imageUrls: brief.moodboardImages });
    const embedding = await embedText(fp.summaryText);

    await prisma.brief.update({
        where: { id: briefId },
        data: { moodboardFingerprint: fp, moodboardEmbedding: embedding },
    });
}

// Prisma composite types use `null` for optional fields; Zod uses `undefined`.
type DbFingerprint = Omit<CreativeFingerprintInput, "productCategory"> & {
    productCategory: string | null;
};
const toDb = (f: CreativeFingerprintInput): DbFingerprint => ({
    ...f,
    productCategory: f.productCategory ?? null,
});
const fromDb = (f: DbFingerprint): CreativeFingerprintInput => ({
    ...f,
    productCategory: f.productCategory ?? undefined,
});

function mergeFingerprints(parts: CreativeFingerprintInput[]): CreativeFingerprintInput {
    const uniq = (xs: string[]) => [...new Set(xs)].slice(0, 12);
    return {
        lighting: uniq(parts.flatMap((p) => p.lighting)),
        palette: uniq(parts.flatMap((p) => p.palette)),
        composition: uniq(parts.flatMap((p) => p.composition)),
        mood: uniq(parts.flatMap((p) => p.mood)),
        productCategory: parts.find((p) => p.productCategory)?.productCategory,
        summaryText: parts.map((p) => p.summaryText).join(" ").slice(0, 6000),
    };
}

/** Fingerprint any un-fingerprinted portfolio assets, roll up, re-embed. */
export async function ingestCrewPortfolio(crewId: string): Promise<void> {
    const crew = await prisma.crew.findUnique({ where: { id: crewId } });
    if (!crew || crew.portfolio.length === 0) return;

    const portfolio = [...crew.portfolio];
    let changed = false;
    for (let i = 0; i < portfolio.length; i++) {
        if (portfolio[i].fingerprint) continue; // cached
        portfolio[i] = {
            ...portfolio[i],
            fingerprint: toDb(await fingerprint({ imageUrls: [portfolio[i].assetUrl] })),
        };
        changed = true;
    }
    if (!changed && crew.embedding.length) return;

    const parts = portfolio
        .map((p) => p.fingerprint)
        .filter((f): f is NonNullable<typeof f> => Boolean(f))
        .map(fromDb);
    if (!parts.length) return;

    const aggregate = mergeFingerprints(parts);
    const embedding = await embedText(aggregate.summaryText);

    await prisma.crew.update({
        where: { id: crewId },
        data: { portfolio, aggregateFingerprint: aggregate, embedding },
    });
}

export async function ingestTalentPortfolio(talentId: string): Promise<void> {
    const talent = await prisma.talent.findUnique({ where: { id: talentId } });
    if (!talent || talent.portfolio.length === 0) return;

    const portfolio = [...talent.portfolio];
    let changed = false;
    for (let i = 0; i < portfolio.length; i++) {
        if (portfolio[i].fingerprint) continue;
        portfolio[i] = {
            ...portfolio[i],
            fingerprint: toDb(await fingerprint({ imageUrls: [portfolio[i].assetUrl] })),
        };
        changed = true;
    }
    if (!changed && talent.embedding.length) return;

    const parts = portfolio
        .map((p) => p.fingerprint)
        .filter((f): f is NonNullable<typeof f> => Boolean(f))
        .map(fromDb);
    if (!parts.length) return;

    const aggregate = mergeFingerprints(parts);
    const embedding = await embedText(
        `${aggregate.summaryText} Look: ${talent.attributes.look.join(", ")}.`
    );

    await prisma.talent.update({
        where: { id: talentId },
        data: { portfolio, embedding },
    });
}

/** Fingerprint a Listing (studio) into its ListingCreativeProfile. */
export async function ingestListing(listingId: string): Promise<void> {
    const existing = await prisma.listingCreativeProfile.findUnique({ where: { listingId } });
    if (existing?.fingerprint && existing.embedding.length) return; // cached

    const listing = await prisma.listing.findUnique({
        where: { id: listingId },
        select: { title: true, description: true, category: true, imageSrc: true, amenities: true },
    });
    if (!listing || listing.imageSrc.length === 0) return;

    const fp = await fingerprint({
        briefText: `Studio "${listing.title}" (${listing.category}). ${listing.description.slice(0, 600)} Amenities: ${listing.amenities.join(", ")}.`,
        imageUrls: listing.imageSrc.slice(0, 6),
    });
    const embedding = await embedText(fp.summaryText);

    await prisma.listingCreativeProfile.upsert({
        where: { listingId },
        create: { listingId, fingerprint: fp, embedding, styleTags: fp.mood },
        update: { fingerprint: fp, embedding, styleTags: fp.mood },
    });
}
