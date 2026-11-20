import "server-only";

import { collectListingMediaRefs } from "@/lib/listing/media";
import prisma from "@/lib/prismadb";

// Every media reference a user's saved records still point at. Anything not in
// here is safe to delete from storage.
export async function collectUserMediaRefs(userId: string): Promise<Set<string>> {
    const [listings, sets, user] = await Promise.all([
        prisma.listing.findMany({
            where: { userId },
            select: { imageSrc: true, videoSrc: true, addons: true, verifications: true },
        }),
        prisma.listingSet.findMany({
            where: { listing: { is: { userId } } },
            select: { images: true },
        }),
        prisma.user.findUnique({
            where: { id: userId },
            select: { profileImage: true, image: true },
        }),
    ]);

    const refs = collectListingMediaRefs({
        imageSrc: [user?.profileImage, user?.image].filter(Boolean),
        sets,
    });
    listings.forEach((listing) => {
        collectListingMediaRefs(listing).forEach((ref) => refs.add(ref));
    });
    return refs;
}
