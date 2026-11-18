import "server-only";

import { unstable_cache } from "next/cache";

import { STUDIO_FEED_TAG } from "@/lib/listing/cacheTags";
import { ListingService } from "@/lib/listing/service";

/** Upper bound on staleness for changes that don't go through `studioChanged`. */
const FEED_CACHE_SECONDS = 300;

type FeedPageParams = Parameters<typeof ListingService.getListingFeedPage>[0];

const cachedFeedPage = unstable_cache(
    (params: FeedPageParams) => ListingService.getListingFeedPage(params),
    ["studio-feed-page-v1"],
    { revalidate: FEED_CACHE_SECONDS, tags: [STUDIO_FEED_TAG] }
);

/**
 * One ranked feed page, cached per filters, sort context and page. Date searches skip the cache:
 * they depend on live bookings, which change without a studio edit.
 */
export const getFeedPage = (params: FeedPageParams) =>
    params.filters.date ? ListingService.getListingFeedPage(params) : cachedFeedPage(params);
