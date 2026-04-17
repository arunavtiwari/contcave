import prisma from "@/lib/prismadb";

export default async function getReviewCount(listingId: string) {
    try {
        if (!listingId) {
            return 0;
        }

        const count = await prisma.review.count({
            where: { listingId }
        });

        return count;
    } catch (error: unknown) {
        console.error(error);
        return 0;
    }
}
