import "server-only";

import { scheduleQstashJob } from "@/lib/cron/qstash";
import { deleteStoredMedia, isOwnedMediaRef, MediaDeletionOutcome } from "@/lib/storage/mediaCleanup";
import { collectUserMediaRefs } from "@/lib/storage/referencedMedia";

const MAX_REFS_PER_DISPATCH = 500;

export function normalizeMediaRefs(
    refs: Iterable<unknown>,
    ownerId: string,
    sourceId?: string
): string[] {
    const seen = new Set<string>();
    for (const ref of refs) {
        if (typeof ref !== "string") continue;
        const trimmed = ref.trim();
        if (!trimmed || seen.has(trimmed)) continue;
        if (!isOwnedMediaRef(trimmed, ownerId, sourceId)) continue;
        seen.add(trimmed);
        if (seen.size >= MAX_REFS_PER_DISPATCH) break;
    }
    return Array.from(seen);
}

export async function executeMediaDeletion(params: {
    refs: Iterable<unknown>;
    ownerId: string;
    sourceId?: string;
}): Promise<MediaDeletionOutcome> {
    const refs = normalizeMediaRefs(params.refs, params.ownerId, params.sourceId);
    if (refs.length === 0) return { deleted: 0, failed: 0 };

    try {
        const inUse = await collectUserMediaRefs(params.ownerId);
        const removable = refs.filter((ref) => !inUse.has(ref));
        if (removable.length === 0) return { deleted: 0, failed: 0 };

        const sourceIds = params.sourceId ? [params.sourceId] : [];
        return await deleteStoredMedia(removable, [params.ownerId], sourceIds);
    } catch (error) {
        console.error("[MediaDeletion] Execution failed:", error);
        return { deleted: 0, failed: refs.length };
    }
}

export async function dispatchMediaDeletion(params: {
    refs: Iterable<unknown>;
    ownerId: string;
    sourceId?: string;
}): Promise<void> {
    const refs = normalizeMediaRefs(params.refs, params.ownerId, params.sourceId);
    if (refs.length === 0) return;

    try {
        const scheduled = await scheduleQstashJob(
            { job: "delete-media", refs, ownerId: params.ownerId },
            new Date()
        );
        if (!scheduled) {
            void executeMediaDeletion(params).catch((error) => {
                console.error("[MediaDeletion] Fallback execution failed:", error);
            });
        }
    } catch (error) {
        console.error("[MediaDeletion] Dispatch failed, executing fallback:", error);
        void executeMediaDeletion(params).catch((fallbackError) => {
            console.error("[MediaDeletion] Fallback execution failed:", fallbackError);
        });
    }
}
