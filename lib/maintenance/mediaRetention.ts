import { Prisma } from "@prisma/client";

import { collectListingMediaRefs } from "@/lib/listing/media";
import prisma from "@/lib/prismadb";
import { enqueueMediaDeletions } from "@/lib/storage/mediaDeletionQueue";

const RETENTION_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

type MediaPurgeResult = {
    id: string;
    status: "purged" | "skipped";
    queued: number;
    ok: boolean;
};

function withoutAddonImages(addons: Prisma.JsonValue): Prisma.InputJsonValue | undefined {
    if (!Array.isArray(addons)) return undefined;
    return addons.map((addon) => (addon && typeof addon === "object" && !Array.isArray(addon)
        ? { ...addon, imageUrl: "" }
        : addon)) as Prisma.InputJsonValue;
}

function getRetentionCutoff(): Date {
    return new Date(Date.now() - RETENTION_DAYS * DAY_MS);
}

// Compliance documents in the private bucket are deliberately left in place:
// signed agreements and verification paperwork outlive the listing.
async function purgeExpiredListingMedia(limit: number): Promise<MediaPurgeResult[]> {
    const cutoff = getRetentionCutoff();

    const listings = await prisma.listing.findMany({
        where: {
            AND: [
                { OR: [{ mediaPurgedAt: null }, { mediaPurgedAt: { isSet: false } }] },
                {
                    OR: [
                        { archivedAt: { lte: cutoff } },
                        { user: { is: { markedForDeletion: true, markedForDeletionAt: { lte: cutoff } } } },
                    ],
                },
            ],
        },
        select: {
            id: true,
            userId: true,
            imageSrc: true,
            videoSrc: true,
            addons: true,
            sets: { select: { images: true } },
        },
        take: limit,
    });

    const results: MediaPurgeResult[] = [];

    for (const listing of listings) {
        try {
            const refs = collectListingMediaRefs(listing);
            const clearedAddons = withoutAddonImages(listing.addons);

            const queued = await prisma.$transaction(async (tx) => {
                await tx.listingSet.updateMany({ where: { listingId: listing.id }, data: { images: [] } });
                await tx.listing.update({
                    where: { id: listing.id },
                    data: {
                        imageSrc: [],
                        videoSrc: null,
                        mediaPurgedAt: new Date(),
                        ...(clearedAddons ? { addons: clearedAddons } : {}),
                    },
                });
                return await enqueueMediaDeletions(tx, {
                    refs,
                    ownerId: listing.userId,
                    reason: "retention-expired",
                    sourceId: listing.id,
                });
            });

            results.push({ id: listing.id, status: "purged", queued, ok: true });
        } catch (error) {
            console.error(`[MediaRetention] Failed to purge listing ${listing.id}`, error);
            results.push({ id: listing.id, status: "skipped", queued: 0, ok: false });
        }
    }

    return results;
}

async function purgeExpiredProfileMedia(limit: number): Promise<MediaPurgeResult[]> {
    const cutoff = getRetentionCutoff();

    const users = await prisma.user.findMany({
        where: {
            markedForDeletion: true,
            markedForDeletionAt: { lte: cutoff },
            OR: [{ profileImage: { not: null } }, { image: { not: null } }],
        },
        select: { id: true, profileImage: true, image: true },
        take: limit,
    });

    const results: MediaPurgeResult[] = [];

    for (const user of users) {
        try {
            const queued = await prisma.$transaction(async (tx) => {
                await tx.user.update({
                    where: { id: user.id },
                    data: { profileImage: null, image: null },
                });
                return await enqueueMediaDeletions(tx, {
                    refs: [user.profileImage, user.image],
                    ownerId: user.id,
                    reason: "retention-expired",
                    sourceId: user.id,
                });
            });

            results.push({ id: user.id, status: "purged", queued, ok: true });
        } catch (error) {
            console.error(`[MediaRetention] Failed to purge profile media for ${user.id}`, error);
            results.push({ id: user.id, status: "skipped", queued: 0, ok: false });
        }
    }

    return results;
}

export async function runMediaRetentionSweep(limit = 50) {
    const [listings, profiles] = await Promise.all([
        purgeExpiredListingMedia(limit),
        purgeExpiredProfileMedia(limit),
    ]);
    return { listings, profiles };
}
