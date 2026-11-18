"use server";

import { unstable_cache } from "next/cache";

import { STUDIOS_TAG } from "@/lib/listing/cacheTags";
import prisma from "@/lib/prismadb";
import { PublicReview } from "@/types/review";

const REVIEWS_CACHE_SECONDS = 3600;
const MAX_REVIEWS = 100;

const loadReviews = unstable_cache(
    async (listingId: string): Promise<PublicReview[]> => {
        const reviews = await prisma.review.findMany({
            where: { listingId },
            include: { user: { select: { name: true, image: true } } },
            orderBy: { createdAt: "desc" },
            take: MAX_REVIEWS,
        });

        return reviews.map((review) => ({
            id: review.id,
            listingId: review.listingId,
            rating: review.rating,
            comment: review.comment,
            source: review.source,
            guestName: review.guestName,
            guestRole: review.guestRole,
            user: review.user,
            createdAt: review.createdAt.toISOString(),
        }));
    },
    ["listing-reviews-v1"],
    { revalidate: REVIEWS_CACHE_SECONDS, tags: [STUDIOS_TAG] }
);

/** A studio's latest reviews. Cached; any review write drops the cache (see lib/prismadb.ts). */
export default async function getReviews(listingId: string): Promise<PublicReview[]> {
    try {
        if (typeof listingId !== "string" || !/^[a-f\d]{24}$/i.test(listingId)) {
            return [];
        }
        return await loadReviews(listingId);
    } catch (error) {
        console.error("[getReviews] Error:", error);
        return [];
    }
}
