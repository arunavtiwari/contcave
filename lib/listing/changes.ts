import "server-only";

import { revalidateTag } from "next/cache";

import { STUDIO_FEED_TAG } from "@/lib/listing/cacheTags";
import { queueSearchReindex } from "@/lib/search/reindex";

/**
 * Call whenever a studio's listing, price, status or reviews change: drops cached feed pages so the
 * next visitor sees the change, and queues the studio's search re-index.
 */
export async function studioChanged(listingId: string): Promise<void> {
    try {
        revalidateTag(STUDIO_FEED_TAG, { expire: 0 });
    } catch (error) {
        // Outside a request (scripts, cron) there is no cache to drop; the feed's TTL still applies.
        console.warn("[studioChanged] Could not revalidate the studio feed", error);
    }
    await queueSearchReindex(listingId);
}
