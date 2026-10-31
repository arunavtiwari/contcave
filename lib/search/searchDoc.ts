import "server-only";

import { createHash } from "node:crypto";

import { ListingService } from "@/lib/listing/service";
import prisma from "@/lib/prismadb";
import { getPlainTextFromHTML } from "@/lib/richText";
import { SEARCH_CONFIG } from "@/lib/search/config";
import { redactPersonalData } from "@/lib/search/redact";

const LISTING_BATCH = 50;

const SEARCH_DOC_SELECT = {
    id: true,
    title: true,
    description: true,
    category: true,
    type: true,
    venueTypes: true,
    aesthetics: true,
    setFeatures: true,
    amenities: true,
    otherAmenities: true,
    locationValue: true,
    sets: { select: { name: true, description: true, aesthetics: true, setFeatures: true } },
    reviews: { select: { comment: true }, orderBy: { createdAt: "desc" as const }, take: SEARCH_CONFIG.searchDocReviewSnippets },
} as const;

type SearchDocSource = Awaited<ReturnType<typeof loadSources>>[number];

async function loadSources(ids: string[]) {
    const listings = await prisma.listing.findMany({ where: { id: { in: ids } }, select: SEARCH_DOC_SELECT });
    const amenityIds = Array.from(new Set(listings.flatMap((listing) => listing.amenities)));
    const amenities = amenityIds.length
        ? await prisma.amenities.findMany({ where: { id: { in: amenityIds } }, select: { id: true, name: true } })
        : [];
    const amenityName = new Map(amenities.map((amenity) => [amenity.id, amenity.name]));
    return listings.map((listing) => ({
        ...listing,
        amenityNames: listing.amenities.map((id) => amenityName.get(id)).filter((name): name is string => Boolean(name)),
    }));
}

function buildSearchText(source: SearchDocSource) {
    const parts = [
        source.title,
        source.category,
        source.locationValue,
        getPlainTextFromHTML(source.description, SEARCH_CONFIG.searchDocMaxChars),
        [...source.type, ...source.venueTypes, ...source.aesthetics, ...source.setFeatures].join(", "),
        [...source.amenityNames, ...source.otherAmenities].join(", "),
        ...source.sets.map((set) => [set.name, set.description ?? "", ...set.aesthetics, ...set.setFeatures].join(", ")),
        ...source.reviews.map((review) => review.comment),
    ];
    return redactPersonalData(parts.filter(Boolean).join(". ")).slice(0, SEARCH_CONFIG.searchDocMaxChars);
}

const hashOf = (text: string) => createHash("sha256").update(text).digest("hex");

export async function refreshSearchDocs(listingIds?: string[]) {
    const ids = await ListingService.getHydratableListingIds({ active: true, status: "VERIFIED" }, listingIds);
    const existing = await prisma.listingSearchDoc.findMany({
        where: listingIds ? { listingId: { in: listingIds } } : undefined,
        select: { listingId: true, hash: true },
    });
    const known = new Map(existing.map((doc) => [doc.listingId, doc]));
    const results: { id: string; status: "indexed" | "removed" }[] = [];

    for (let start = 0; start < ids.length; start += LISTING_BATCH) {
        const sources = await loadSources(ids.slice(start, start + LISTING_BATCH));
        const changed = sources
            .map((source) => ({ source, text: buildSearchText(source) }))
            .map((entry) => ({ ...entry, hash: hashOf(entry.text) }))
            .filter(({ source, hash }) => known.get(source.id)?.hash !== hash);

        for (const { source, text, hash } of changed) {
            const data = { text, hash };
            await prisma.listingSearchDoc.upsert({
                where: { listingId: source.id },
                create: { listingId: source.id, ...data },
                update: data,
            });
            results.push({ id: source.id, status: "indexed" });
        }
    }

    const live = new Set(ids);
    const stale = existing.map((doc) => doc.listingId).filter((id) => !live.has(id));
    if (!stale.length) return results;
    if (!listingIds && !ids.length) {
        console.warn("[ai-search] No live listings found; keeping existing search docs.");
        return results;
    }
    await prisma.listingSearchDoc.deleteMany({ where: { listingId: { in: stale } } });
    results.push(...stale.map((id) => ({ id, status: "removed" as const })));
    return results;
}

export async function loadSearchDocs(listingIds: string[]): Promise<Map<string, string>> {
    if (!listingIds.length) return new Map();
    const docs = await prisma.listingSearchDoc.findMany({
        where: { listingId: { in: listingIds } },
        select: { listingId: true, text: true },
    });
    return new Map(docs.map((doc) => [doc.listingId, doc.text]));
}
