import prisma from "@/lib/prismadb";

export default async function getPendingListings() {
    try {
        const pendingListings = await prisma.listing.findMany({
            where: {
                status: 'PENDING'
            },
            select: {
                id: true,
                title: true,
                imageSrc: true,
                locationValue: true,
                category: true,
                price: true,
                createdAt: true,
                user: {
                    select: {
                        name: true,
                        email: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return pendingListings;
    } catch (error: unknown) {
        throw new Error(String(error));
    }
}
