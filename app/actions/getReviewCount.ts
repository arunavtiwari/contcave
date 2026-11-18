import "server-only";

import { unstable_cache } from "next/cache";

import { STUDIOS_TAG } from "@/lib/listing/cacheTags";
import prisma from "@/lib/prismadb";

const loadReviewCount = unstable_cache(
    (listingId: string) => prisma.review.count({ where: { listingId } }),
    ["listing-review-count-v1"],
    { revalidate: 3600, tags: [STUDIOS_TAG] }
);

/** How many reviews a studio has. Cached; any review write drops the cache (see lib/prismadb.ts). */
export default async function getReviewCount(listingId: string) {
    try {
        if (!/^[a-f\d]{24}$/i.test(listingId)) {
            return 0;
        }
        return await loadReviewCount(listingId);
    } catch (error: unknown) {
        console.error("[getReviewCount] Error:", error);
        return 0;
    }
}
