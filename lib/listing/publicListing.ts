import "server-only";

import { unstable_cache } from "next/cache";

import { STUDIOS_TAG } from "@/lib/listing/cacheTags";
import { ListingService } from "@/lib/listing/service";

const PUBLIC_LISTING_CACHE_SECONDS = 300;

/**
 * A studio as any visitor sees it (public location only, archived hidden), cached by id or slug.
 * Owners and admins need private details, so callers read those uncached.
 */
export const getPublicListing = unstable_cache(
    (listingId: string) => ListingService.findById(listingId),
    ["public-listing-v1"],
    { revalidate: PUBLIC_LISTING_CACHE_SECONDS, tags: [STUDIOS_TAG] }
);
