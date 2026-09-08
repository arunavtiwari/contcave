"use server";



import prisma from "@/lib/prismadb";
import { PublicReview } from "@/types/review";

export default async function getReviews(listingId: string): Promise<PublicReview[]> {
    try {
        if (typeof listingId !== "string" || !/^[a-f\d]{24}$/i.test(listingId)) {
            return [];
        }

        const reviews = await prisma.review.findMany({
            where: {
                listingId: listingId,
            },
            include: {
                user: {
                    select: {
                        name: true,
                        image: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
            take: 100,
        });

        return reviews.map((review) => ({
            ...review,
            createdAt: review.createdAt.toISOString(),
        }));
    } catch (error) {
        console.error('[getReviews] Error:', error);
        return [];
    }
}
