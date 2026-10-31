import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
    listingSearchDoc: { findMany: vi.fn(), upsert: vi.fn(), deleteMany: vi.fn() },
    listing: { findMany: vi.fn() },
    amenities: { findMany: vi.fn() },
}));
const liveListingIds = vi.hoisted(() => vi.fn());
const scheduleQstashJob = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prismadb", () => ({ default: db }));
vi.mock("@/lib/listing/service", () => ({ ListingService: { getHydratableListingIds: liveListingIds } }));
vi.mock("@/lib/cron/qstash", () => ({ scheduleQstashJob }));

const { refreshSearchDocs } = await import("@/lib/search/searchDoc");
const { queueSearchReindex } = await import("@/lib/search/reindex");

const LIVE = "a".repeat(24);
const GONE = "b".repeat(24);
const LIVE_FILTER = { active: true, status: "VERIFIED" };

beforeEach(() => {
    vi.clearAllMocks();
    db.listing.findMany.mockResolvedValue([]);
    db.amenities.findMany.mockResolvedValue([]);
    db.listingSearchDoc.findMany.mockResolvedValue([{ listingId: LIVE, hash: "x" }, { listingId: GONE, hash: "y" }]);
});

describe("search index refresh", () => {
    it("keeps every document when the live lookup returns nothing", async () => {
        liveListingIds.mockResolvedValue([]);
        await refreshSearchDocs();
        expect(db.listingSearchDoc.deleteMany).not.toHaveBeenCalled();
    });

    it("removes documents only for listings that are no longer live", async () => {
        liveListingIds.mockResolvedValue([LIVE]);
        await refreshSearchDocs();
        expect(db.listingSearchDoc.deleteMany).toHaveBeenCalledWith({ where: { listingId: { in: [GONE] } } });
    });

    it("limits a single-studio refresh to that studio", async () => {
        liveListingIds.mockResolvedValue([]);
        db.listingSearchDoc.findMany.mockResolvedValue([{ listingId: GONE, hash: "y" }]);
        await refreshSearchDocs([GONE]);
        expect(liveListingIds).toHaveBeenCalledWith(LIVE_FILTER, [GONE]);
        expect(db.listingSearchDoc.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { listingId: { in: [GONE] } } }));
        expect(db.listingSearchDoc.deleteMany).toHaveBeenCalledWith({ where: { listingId: { in: [GONE] } } });
    });
});

describe("queueSearchReindex", () => {
    it("sends edits made within the same minute to one delivery for that studio", async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-10-31T10:00:15Z"));
        await queueSearchReindex(LIVE);
        vi.setSystemTime(new Date("2026-10-31T10:00:45Z"));
        await queueSearchReindex(LIVE);
        vi.useRealTimers();

        const [first, second] = scheduleQstashJob.mock.calls;
        expect(first).toEqual([{ job: "search-index-listing", listingId: LIVE }, new Date("2026-10-31T10:01:00Z")]);
        expect(second).toEqual(first);
    });
});
