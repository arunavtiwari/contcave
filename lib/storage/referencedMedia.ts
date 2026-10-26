import "server-only";

import { collectListingMediaRefs } from "@/lib/listing/media";
import prisma from "@/lib/prismadb";

// Every media reference a user's saved records still point at. Anything not in
// here is safe to delete from storage.
export async function collectUserMediaRefs(userId: string): Promise<Set<string>> {
    const [listings, sets, user] = await Promise.all([
        prisma.listing.findMany({
            where: { userId },
            select: { imageSrc: true, videoSrc: true, addons: true, equipment: true, verifications: true },
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

/**
 * Which of these refs are still used anywhere, by any user. A listing can hold files uploaded
 * by someone else (an admin editing an owner's studio stores them under the admin's folder), so
 * the owner-only check above isn't enough on its own before deleting.
 */
export async function collectRefsInUseAnywhere(refs: string[]): Promise<Set<string>> {
    const inUse = new Set<string>();
    if (refs.length === 0) return inUse;

    // Add-on images live in a JSON field Mongo can't search with hasSome, so also load every
    // listing named in the refs' storage paths and check their media in full.
    const listingIdsInPaths = Array.from(new Set(
        refs.flatMap((ref) => Array.from(ref.matchAll(/\/listings\/([a-f\d]{24})\//gi), (match) => match[1]))
    ));

    const [byGallery, bySets, byPath, byProfile] = await Promise.all([
        prisma.listing.findMany({
            where: { OR: [{ imageSrc: { hasSome: refs } }, { videoSrc: { in: refs } }] },
            select: { imageSrc: true, videoSrc: true },
        }),
        prisma.listingSet.findMany({ where: { images: { hasSome: refs } }, select: { images: true } }),
        listingIdsInPaths.length
            ? prisma.listing.findMany({
                where: { id: { in: listingIdsInPaths } },
                select: { imageSrc: true, videoSrc: true, addons: true, equipment: true, verifications: true, sets: { select: { images: true } } },
            })
            : Promise.resolve([]),
        prisma.user.findMany({
            where: { OR: [{ profileImage: { in: refs } }, { image: { in: refs } }] },
            select: { profileImage: true, image: true },
        }),
    ]);

    const referenced = new Set<string>();
    byGallery.forEach((listing) => collectListingMediaRefs(listing).forEach((ref) => referenced.add(ref)));
    collectListingMediaRefs({ sets: bySets }).forEach((ref) => referenced.add(ref));
    byPath.forEach((listing) => collectListingMediaRefs(listing).forEach((ref) => referenced.add(ref)));
    byProfile.forEach((user) => [user.profileImage, user.image].forEach((ref) => ref && referenced.add(ref)));

    refs.forEach((ref) => referenced.has(ref) && inUse.add(ref));
    return inUse;
}
