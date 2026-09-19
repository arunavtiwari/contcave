import "server-only";

import { Prisma } from "@prisma/client";

import prisma from "@/lib/prismadb";
import { deleteStoredMedia, isOwnedMediaRef } from "@/lib/storage/mediaCleanup";
import { collectUserMediaRefs } from "@/lib/storage/referencedMedia";

export type MediaDeletionReason =
    | "listing-media-replaced"
    | "profile-image-replaced"
    | "listing-write-failed"
    | "upload-abandoned"
    | "retention-expired";

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;

// Media a user removed themselves waits out a grace period so an accidental
// deletion is still recoverable. Media that was never referenced by a saved
// record has nothing to recover and drains on the next pass.
const GRACE_MS: Record<MediaDeletionReason, number> = {
    "listing-media-replaced": 24 * HOUR_MS,
    "profile-image-replaced": 24 * HOUR_MS,
    "listing-write-failed": 0,
    "upload-abandoned": 0,
    "retention-expired": 0,
};

const MAX_ATTEMPTS = 5;
const LEASE_MS = 10 * MINUTE_MS;
const RETRY_BACKOFF_MS = 30 * MINUTE_MS;
const MAX_REFS_PER_ENQUEUE = 500;

type QueueClient = Prisma.TransactionClient | typeof prisma;

export type MediaDrainResult = {
    id: string;
    status: "drained" | "failed";
    deleted: number;
    cancelled: number;
    ok: boolean;
    error?: string;
};

function normalizeRefs(refs: Iterable<unknown>, ownerId: string): string[] {
    const seen = new Set<string>();
    for (const ref of refs) {
        if (typeof ref !== "string") continue;
        const trimmed = ref.trim();
        if (!trimmed || seen.has(trimmed)) continue;
        if (!isOwnedMediaRef(trimmed, ownerId)) continue;
        seen.add(trimmed);
        if (seen.size >= MAX_REFS_PER_ENQUEUE) break;
    }
    return Array.from(seen);
}

// Called inside the same transaction as the write that orphaned the media, so
// a committed save can never lose its cleanup.
export async function enqueueMediaDeletions(
    client: QueueClient,
    params: { refs: Iterable<unknown>; ownerId: string; reason: MediaDeletionReason; sourceId?: string }
): Promise<number> {
    if (!params.ownerId) return 0;
    const refs = normalizeRefs(params.refs, params.ownerId);
    if (refs.length === 0) return 0;

    const scheduledAt = new Date(Date.now() + GRACE_MS[params.reason]);
    await client.pendingMediaDeletion.deleteMany({ where: { ref: { in: refs } } });
    await client.pendingMediaDeletion.createMany({
        data: refs.map((ref) => ({
            ref,
            ownerId: params.ownerId,
            reason: params.reason,
            sourceId: params.sourceId ?? null,
            scheduledAt,
        })),
    });
    return refs.length;
}

// Clears queued deletions for media a save has put back into use, so restoring
// a removed image within its grace period keeps the file.
export async function cancelMediaDeletions(client: QueueClient, refs: Iterable<unknown>): Promise<number> {
    const list = Array.from(new Set(
        Array.from(refs).filter((ref): ref is string => typeof ref === "string" && ref.trim().length > 0)
    )).slice(0, MAX_REFS_PER_ENQUEUE);
    if (list.length === 0) return 0;

    const { count } = await client.pendingMediaDeletion.deleteMany({ where: { ref: { in: list } } });
    return count;
}

// The batch has to clear a whole retention sweep in one pass, which can queue
// several hundred refs at once. Rows are grouped per owner and each owner's keys
// go out in a single batched delete, so a large limit is a handful of calls.
export async function drainMediaDeletionQueue(limit = 2_000): Promise<MediaDrainResult[]> {
    const now = new Date();
    const due = await prisma.pendingMediaDeletion.findMany({
        where: { scheduledAt: { lte: now }, attempts: { lt: MAX_ATTEMPTS } },
        orderBy: { scheduledAt: "asc" },
        take: limit,
        select: { id: true, ref: true, ownerId: true },
    });
    if (due.length === 0) return [];

    // Lease the batch so an overlapping run does not pick up the same rows.
    await prisma.pendingMediaDeletion.updateMany({
        where: { id: { in: due.map((row) => row.id) } },
        data: { scheduledAt: new Date(now.getTime() + LEASE_MS), attempts: { increment: 1 } },
    });

    const byOwner = new Map<string, typeof due>();
    for (const row of due) {
        const rows = byOwner.get(row.ownerId) ?? [];
        rows.push(row);
        byOwner.set(row.ownerId, rows);
    }

    const results: MediaDrainResult[] = [];

    for (const [ownerId, rows] of byOwner) {
        const ids = rows.map((row) => row.id);
        try {
            const inUse = await collectUserMediaRefs(ownerId);
            const removable = rows.filter((row) => !inUse.has(row.ref));
            const cancelled = rows.length - removable.length;

            const outcome = removable.length > 0
                ? await deleteStoredMedia(removable.map((row) => row.ref), [ownerId])
                : { deleted: 0, failed: 0 };

            if (outcome.failed > 0) {
                throw new Error(`Storage rejected ${outcome.failed} of ${removable.length} objects`);
            }

            await prisma.pendingMediaDeletion.deleteMany({ where: { id: { in: ids } } });
            results.push({ id: ownerId, status: "drained", deleted: outcome.deleted, cancelled, ok: true });
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error(`[MediaDeletionQueue] Failed to drain media for ${ownerId}`, error);
            await prisma.pendingMediaDeletion.updateMany({
                where: { id: { in: ids } },
                data: { scheduledAt: new Date(Date.now() + RETRY_BACKOFF_MS), lastError: message.slice(0, 500) },
            });
            results.push({ id: ownerId, status: "failed", deleted: 0, cancelled: 0, ok: false, error: message });
        }
    }

    const exhausted = await prisma.pendingMediaDeletion.count({ where: { attempts: { gte: MAX_ATTEMPTS } } });
    if (exhausted > 0) {
        console.warn(`[MediaDeletionQueue] ${exhausted} media deletions exhausted their retries and need review`);
    }

    return results;
}
