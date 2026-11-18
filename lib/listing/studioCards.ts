import "server-only";

import { getPublishedListings } from "@/lib/listing/cities";
import { toStudioFeedItem } from "@/lib/listing/feedQuery";
import prisma from "@/lib/prismadb";
import { shuffleCopy } from "@/lib/shuffle";
import type { StudioFeedItem } from "@/types/listing";

const CARD_SELECT = {
    id: true,
    slug: true,
    title: true,
    imageSrc: true,
    price: true,
    locationValue: true,
    category: true,
    venueTypes: true,
    status: true,
    hasSets: true,
    carpetArea: true,
    maximumPax: true,
    listingType: true,
    priceRangeMin: true,
    priceRangeMax: true,
    avgReviewRating: true,
    actualLocation: true,
} as const;

/** Card data for these studios in one query, in the order given. */
export async function loadStudioCards(ids: string[]): Promise<StudioFeedItem[]> {
    if (ids.length === 0) return [];
    const rows = await prisma.listing.findMany({ where: { id: { in: ids } }, select: CARD_SELECT });
    const byId = new Map(rows.map((row) => [row.id, toStudioFeedItem(row)]));
    return ids.flatMap((id) => byId.get(id) ?? []);
}

/**
 * Random bookable studios for showcases, picked from the cached published snapshot. Curated studios
 * are enquiry-only, so they're left out.
 */
export async function getFeaturedStudios(limit: number): Promise<StudioFeedItem[]> {
    const bookable = (await getPublishedListings()).filter((listing) => listing.listingType === "STANDARD");
    return loadStudioCards(shuffleCopy(bookable).slice(0, limit).map((listing) => listing.id));
}
