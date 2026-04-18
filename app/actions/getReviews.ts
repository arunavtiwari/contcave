"use server";



import prisma from "@/lib/prismadb";

export default async function getReviews(listingId: string) {
    try {
        if (!listingId || typeof listingId !== "string" || listingId.trim().length === 0) {
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

        return reviews;
    } catch (error) {
        console.error('[getReviews] Error:', error);
        return [];
    }
}
