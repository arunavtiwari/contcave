import { describe, expect, it } from "vitest";

import { LISTING_WIDE_SLOT_ID, reservationSlotRows } from "@/lib/reservation/slots";

const BASE = {
    listingId: "a".repeat(24),
    reservationId: "b".repeat(24),
    startDate: new Date("2026-10-10T00:00:00.000Z"),
};

const keysOf = (rows: ReturnType<typeof reservationSlotRows>) => rows?.map((row) => `${row.dateKey} ${row.slotKey} ${row.setId}`);

describe("reservationSlotRows", () => {
    it("writes one listing-wide row per 30-minute slot, end exclusive", () => {
        const rows = reservationSlotRows({ ...BASE, startTime: "10:00 AM", endTime: "11:30 AM", setIds: [] });
        expect(keysOf(rows)).toEqual([
            `2026-10-10 10:00 ${LISTING_WIDE_SLOT_ID}`,
            `2026-10-10 10:30 ${LISTING_WIDE_SLOT_ID}`,
            `2026-10-10 11:00 ${LISTING_WIDE_SLOT_ID}`,
        ]);
        expect(rows?.[0]).toMatchObject({ listingId: BASE.listingId, reservationId: BASE.reservationId });
    });

    it("treats a 12:00 AM end as the end of the same day", () => {
        expect(keysOf(reservationSlotRows({ ...BASE, startTime: "11:00 PM", endTime: "12:00 AM", setIds: [] }))).toEqual([
            `2026-10-10 23:00 ${LISTING_WIDE_SLOT_ID}`,
            `2026-10-10 23:30 ${LISTING_WIDE_SLOT_ID}`,
        ]);
    });

    it("writes a row per distinct set and accepts 24-hour times", () => {
        expect(keysOf(reservationSlotRows({ ...BASE, startTime: "09:00", endTime: "10:00", setIds: ["s1", "s2", "s1"] }))).toEqual([
            "2026-10-10 09:00 s1",
            "2026-10-10 09:00 s2",
            "2026-10-10 09:30 s1",
            "2026-10-10 09:30 s2",
        ]);
    });

    it("returns null for an invalid or reversed range", () => {
        expect(reservationSlotRows({ ...BASE, startTime: "2:00 PM", endTime: "1:00 PM", setIds: [] })).toBeNull();
        expect(reservationSlotRows({ ...BASE, startTime: "noon", endTime: "1:00 PM", setIds: [] })).toBeNull();
    });
});
