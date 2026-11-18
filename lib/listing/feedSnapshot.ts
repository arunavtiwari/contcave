import { z } from "zod";

const SNAPSHOT_PREFIX = "contcave:feed:";

/** Studios already shown and where the visitor was, so Back returns them to the same spot. */
export type FeedSnapshot<T extends { id: string }> = {
    url: string;
    items: T[];
    loaded: { page: number; firstId: string }[];
    totalPages: number;
    /** The card at the top of the screen and how far below the viewport top it sat. */
    anchor: FeedAnchor | null;
    /** Set when the visitor left by opening a studio, so the next visit to this URL restores once. */
    returnPending: boolean;
    savedAt: number;
};

export type FeedAnchor = { id: string; offset: number };

/** How long a pending return stays valid; older snapshots are ignored. */
export const RETURN_TTL_MS = 30 * 60 * 1000;

const snapshotSchema = z.object({
    url: z.string(),
    items: z.array(z.object({ id: z.string() }).passthrough()),
    loaded: z.array(z.object({ page: z.number().int().positive(), firstId: z.string() })).min(1),
    totalPages: z.number().int().nonnegative(),
    anchor: z.object({ id: z.string(), offset: z.number() }).nullable(),
    returnPending: z.boolean(),
    savedAt: z.number(),
});

export const feedSnapshotKey = (feedKey: string) => `${SNAPSHOT_PREFIX}${feedKey}`;

export function writeFeedSnapshot<T extends { id: string }>(storage: Storage, feedKey: string, snapshot: FeedSnapshot<T>) {
    try {
        storage.setItem(feedSnapshotKey(feedKey), JSON.stringify(snapshot));
    } catch {
        // Storage can be full or blocked (private mode); restoring is a nicety, never required.
    }
}

/**
 * The snapshot to restore: taken at this `url`, left through a studio link, and recent. Returns null
 * for a fresh visit so the feed starts at the top.
 */
export function readFeedSnapshot<T extends { id: string }>(storage: Storage, feedKey: string, url: string, now = Date.now()): FeedSnapshot<T> | null {
    try {
        const raw = storage.getItem(feedSnapshotKey(feedKey));
        const parsed = raw ? snapshotSchema.safeParse(JSON.parse(raw)) : null;
        if (!parsed?.success) return null;
        const { url: savedUrl, returnPending, savedAt } = parsed.data;
        if (savedUrl !== url || !returnPending || now - savedAt > RETURN_TTL_MS) return null;
        // Validated shape; the items were our own StudioFeedItems when saved.
        return parsed.data as FeedSnapshot<T>;
    } catch {
        return null;
    }
}
