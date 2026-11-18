import { describe, expect, it } from "vitest";

import { feedSnapshotKey, readFeedSnapshot, RETURN_TTL_MS, writeFeedSnapshot } from "@/lib/listing/feedSnapshot";

function memoryStorage(): Storage {
    const values = new Map<string, string>();
    return {
        get length() {
            return values.size;
        },
        clear: () => values.clear(),
        getItem: (key) => values.get(key) ?? null,
        key: (index) => Array.from(values.keys())[index] ?? null,
        removeItem: (key) => void values.delete(key),
        setItem: (key, value) => void values.set(key, value),
    };
}

const snapshot = {
    url: "/studios?page=2",
    items: [{ id: "a" }, { id: "b" }],
    loaded: [{ page: 1, firstId: "a" }, { page: 2, firstId: "b" }],
    totalPages: 5,
    anchor: { id: "b", offset: 96 },
    returnPending: true,
    savedAt: 1_000,
};

describe("feed snapshots", () => {
    it("returns the snapshot when coming back to the same URL", () => {
        const storage = memoryStorage();
        writeFeedSnapshot(storage, "/studios", snapshot);
        expect(readFeedSnapshot(storage, "/studios", "/studios?page=2", 2_000)).toEqual(snapshot);
    });

    it("ignores fresh visits and stale returns", () => {
        const storage = memoryStorage();
        writeFeedSnapshot(storage, "/studios", { ...snapshot, returnPending: false });
        expect(readFeedSnapshot(storage, "/studios", snapshot.url, 2_000)).toBeNull();
        writeFeedSnapshot(storage, "/studios", snapshot);
        expect(readFeedSnapshot(storage, "/studios", snapshot.url, snapshot.savedAt + RETURN_TTL_MS + 1)).toBeNull();
    });

    it("ignores snapshots taken at another URL or for another feed", () => {
        const storage = memoryStorage();
        writeFeedSnapshot(storage, "/studios", snapshot);
        expect(readFeedSnapshot(storage, "/studios", "/studios?page=3", 2_000)).toBeNull();
        expect(readFeedSnapshot(storage, "/studios?sort=price_asc", "/studios?page=2", 2_000)).toBeNull();
    });

    it("ignores corrupt or malformed data", () => {
        const storage = memoryStorage();
        storage.setItem(feedSnapshotKey("/studios"), "{not json");
        expect(readFeedSnapshot(storage, "/studios", "/studios")).toBeNull();
        storage.setItem(feedSnapshotKey("/studios"), JSON.stringify({ ...snapshot, loaded: [] }));
        expect(readFeedSnapshot(storage, "/studios", snapshot.url)).toBeNull();
    });

    it("never throws when storage is unavailable", () => {
        const blocked = { ...memoryStorage(), setItem: () => { throw new Error("QuotaExceededError"); }, getItem: () => { throw new Error("SecurityError"); } };
        expect(() => writeFeedSnapshot(blocked, "/studios", snapshot)).not.toThrow();
        expect(readFeedSnapshot(blocked, "/studios", snapshot.url)).toBeNull();
    });
});
