import "server-only";

import { unstable_cache } from "next/cache";

import { STUDIOS_TAG } from "@/lib/listing/cacheTags";
import { categoriesOf } from "@/lib/listing/categories";
import { getPublishedListings, type PublishedListing } from "@/lib/listing/cities";
import { loadStudioCards } from "@/lib/listing/studioCards";
import type { StudioFeedItem } from "@/types/listing";

const RELATED_LIMIT = 4;
const RELATED_CACHE_SECONDS = 3600;
const SAME_CITY_SCORE = 10;
const MAX_SHARED_CATEGORIES = 3;

type RelatedSubject = Pick<PublishedListing, "id" | "locationValue" | "category" | "type" | "venueTypes" | "setFeatures">;

/**
 * Up to four published studios most like `subject`: same city first, then the most shared
 * categories, keeping the snapshot's order on ties. Pure, so it is unit tested directly.
 */
export function pickRelated(subject: RelatedSubject, published: RelatedSubject[], limit = RELATED_LIMIT): string[] {
    const own = new Set(categoriesOf(subject).map((category) => category.slug));
    const score = (candidate: RelatedSubject) => {
        const sameCity = Boolean(subject.locationValue) && candidate.locationValue === subject.locationValue;
        const shared = categoriesOf(candidate).filter((category) => own.has(category.slug)).length;
        return (sameCity ? SAME_CITY_SCORE : 0) + Math.min(shared, MAX_SHARED_CATEGORIES);
    };

    return published
        .filter((candidate) => candidate.id !== subject.id)
        .map((candidate, index) => ({ id: candidate.id, index, score: score(candidate) }))
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score || a.index - b.index)
        .slice(0, limit)
        .map((item) => item.id);
}

async function loadRelatedStudios(subject: RelatedSubject): Promise<StudioFeedItem[]> {
    const ids = pickRelated(subject, await getPublishedListings());
    return loadStudioCards(ids);
}

/** Cards for the "More studios" row on a studio page: one cached query instead of ranking all listings per visit. */
export const getRelatedStudios = unstable_cache(loadRelatedStudios, ["related-studios-v1"], {
    revalidate: RELATED_CACHE_SECONDS,
    tags: [STUDIOS_TAG],
});
