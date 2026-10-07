import { beforeAll, describe, expect, it, vi } from "vitest";

const upsert = vi.fn();
vi.mock("@/lib/prismadb", () => ({ default: { searchSession: { upsert } } }));

const { newSearchSessionToken, recordSearchEvent, sessionIdFromToken } = await import("@/lib/search/session");
const { searchEventSchema } = await import("@/schemas/search");

beforeAll(() => {
    vi.stubEnv("AUTH_SECRET", "unit-test-secret");
});

describe("search session tokens", () => {
    it("issues tokens the event schema accepts and the server can verify", () => {
        const token = newSearchSessionToken();
        expect(searchEventSchema.safeParse({ sessionToken: token, type: "click" }).success).toBe(true);
        expect(sessionIdFromToken(token)).toBe(token.split(".")[0]);
    });

    it("rejects forged, tampered and malformed tokens", () => {
        const [id, signature] = newSearchSessionToken().split(".");
        const [otherId] = newSearchSessionToken().split(".");
        const flipped = `${signature.slice(0, -1)}${signature.endsWith("A") ? "B" : "A"}`;
        for (const token of [`${otherId}.${signature}`, `${id}.${flipped}`, id, `${id}.${signature}.x`, "", `zz.${signature}`]) {
            expect(sessionIdFromToken(token)).toBeNull();
        }
    });

    it("ignores events with an unsigned session id without touching the database", async () => {
        const forged = `${"a".repeat(24)}.${"A".repeat(43)}`;
        await expect(recordSearchEvent({ sessionToken: forged, type: "click" })).resolves.toBe(false);
        expect(upsert).not.toHaveBeenCalled();
    });

    it("records events for a signed session", async () => {
        await expect(recordSearchEvent({ sessionToken: newSearchSessionToken(), type: "handoff" })).resolves.toBe(true);
        expect(upsert).toHaveBeenCalledOnce();
    });
});
