import "server-only";

import { createHash } from "node:crypto";

import { unstable_cache } from "next/cache";

import { ListingService } from "@/lib/listing/service";
import prisma from "@/lib/prismadb";
import { getPlainTextFromHTML } from "@/lib/richText";
import { bytesToVector, EMBEDDING_MODEL, embeddingsConfigured, embedTexts, vectorToBytes } from "@/lib/search/ai/embeddings";
import { SEARCH_CONFIG } from "@/lib/search/config";
import { redactPersonalData } from "@/lib/search/redact";

const LISTING_BATCH = 50;
const EMBED_BATCH = 16;

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

const hashOf = (text: string) => createHash("sha256").update(`${EMBEDDING_MODEL}\n${text}`).digest("hex");

type EmbeddingBytes = ReturnType<typeof vectorToBytes>;

async function embedAll(texts: string[]): Promise<(EmbeddingBytes | null)[]> {
    if (!embeddingsConfigured()) return texts.map(() => null);
    const vectors: (EmbeddingBytes | null)[] = [];
    for (let start = 0; start < texts.length; start += EMBED_BATCH) {
        const batch = texts.slice(start, start + EMBED_BATCH);
        try {
            const embedded = await embedTexts(batch, SEARCH_CONFIG.timeoutsMs.index);
            vectors.push(...embedded.map(vectorToBytes));
        } catch (error) {
            console.error("[ai-search] Embedding batch failed; storing text only.", error);
            vectors.push(...batch.map(() => null));
        }
    }
    return vectors;
}

export async function refreshSearchDocs() {
    const ids = await ListingService.getHydratableListingIds({ active: true, status: "VERIFIED" });
    const existing = await prisma.listingSearchDoc.findMany({ select: { listingId: true, hash: true, embedding: true } });
    const known = new Map(existing.map((doc) => [doc.listingId, doc]));
    const wantVectors = embeddingsConfigured();
    const results: { id: string; status: "indexed" | "removed" }[] = [];

    for (let start = 0; start < ids.length; start += LISTING_BATCH) {
        const sources = await loadSources(ids.slice(start, start + LISTING_BATCH));
        const changed = sources
            .map((source) => ({ source, text: buildSearchText(source) }))
            .map((entry) => ({ ...entry, hash: hashOf(entry.text) }))
            .filter(({ source, hash }) => {
                const doc = known.get(source.id);
                return !doc || doc.hash !== hash || (wantVectors && !doc.embedding);
            });
        const vectors = await embedAll(changed.map((entry) => entry.text));

        for (const [index, { source, text, hash }] of changed.entries()) {
            const data = { text, hash, model: vectors[index] ? EMBEDDING_MODEL : null, embedding: vectors[index] };
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
    if (stale.length) {
        await prisma.listingSearchDoc.deleteMany({ where: { listingId: { in: stale } } });
        results.push(...stale.map((id) => ({ id, status: "removed" as const })));
    }
    return results;
}

export type SearchDoc = { text: string; vector: Float32Array | null };

export async function loadSearchDocs(listingIds: string[]): Promise<Map<string, SearchDoc>> {
    if (!listingIds.length) return new Map();
    const docs = await prisma.listingSearchDoc.findMany({
        where: { listingId: { in: listingIds } },
        select: { listingId: true, text: true, embedding: true, model: true },
    });
    return new Map(docs.map((doc) => [doc.listingId, {
        text: doc.text,
        vector: doc.embedding && doc.model === EMBEDDING_MODEL ? bytesToVector(doc.embedding) : null,
    }]));
}

async function embedQueryText(text: string): Promise<number[]> {
    const [vector] = await embedTexts([text], SEARCH_CONFIG.timeoutsMs.embed);
    return Array.from(vector);
}

const cachedQueryVector = unstable_cache(embedQueryText, [SEARCH_CONFIG.cacheVersion, "query-embedding", EMBEDDING_MODEL], { revalidate: SEARCH_CONFIG.cacheSeconds });

export async function embedQuery(text: string, allowAi: boolean): Promise<Float32Array | null> {
    if (!allowAi || !text || !embeddingsConfigured()) return null;
    try {
        return Float32Array.from(await cachedQueryVector(text));
    } catch {
        return null;
    }
}
