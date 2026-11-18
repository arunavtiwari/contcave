import { revalidateTag } from "next/cache";

import { STUDIOS_TAG } from "@/lib/listing/cacheTags";

/** Models whose data appears on studio pages, the feed or studio cards. */
const STUDIO_MODELS: ReadonlySet<string> = new Set(["Listing", "ListingSet", "Package", "ListingBlock", "Review", "Amenities"]);

const WRITE_OPERATIONS: ReadonlySet<string> = new Set([
    "create",
    "createMany",
    "createManyAndReturn",
    "update",
    "updateMany",
    "updateManyAndReturn",
    "upsert",
    "delete",
    "deleteMany",
]);

export const isStudioWrite = (model: string | undefined, operation: string) =>
    Boolean(model && STUDIO_MODELS.has(model) && WRITE_OPERATIONS.has(operation));

/**
 * Drops every cached studio page, feed page and snapshot. `{ expire: 0 }` means the next visitor
 * gets fresh data rather than a stale copy while it reloads.
 */
export function invalidateStudioCaches(reason: string) {
    try {
        revalidateTag(STUDIOS_TAG, { expire: 0 });
    } catch (error) {
        // Scripts and cron jobs run outside a request, where there is no cache to drop; the
        // caches' own time limits still bound how stale they can get.
        console.warn(`[studio-cache] Not invalidated after ${reason}:`, error instanceof Error ? error.message : error);
    }
}
