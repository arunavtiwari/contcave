import { describe, expect, it } from "vitest";

import { decodeFeedCursor, encodeFeedCursor } from "@/lib/listing/feedQuery";

describe("feed cursors", () => {
    it("rejects forged cursors", () => {
        const forged = Buffer.from(JSON.stringify({ p: 1, d: 1.5, w: 1, t: "yesterday", id: "nope" })).toString("base64url");
        for (const cursor of ["not-a-cursor", forged]) {
            expect(() => decodeFeedCursor(cursor)).toThrow("Invalid feed cursor");
        }
    });

    it("round-trips a valid cursor", () => {
        const cursor = { p: 1 as const, d: 1520, w: 1 as const, t: "2026-10-01T00:00:00.000Z", id: "a".repeat(24) };
        expect(decodeFeedCursor(encodeFeedCursor(cursor))).toEqual(cursor);
    });
});
