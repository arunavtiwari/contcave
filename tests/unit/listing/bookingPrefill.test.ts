import { describe, expect, it } from "vitest";

import { bookingPrefillQuery, parseBookingPrefill } from "@/lib/listing/bookingPrefill";

const TODAY = "2026-10-06";

describe("booking prefill", () => {
    it("round-trips a deep link from search into booking state", () => {
        const query = bookingPrefillQuery({ date: "2026-10-10", start: 600, end: 840, setIds: ["s2"] });
        const parsed = parseBookingPrefill(Object.fromEntries(new URLSearchParams(query)), ["s1", "s2"], TODAY);
        expect(parsed).toEqual({ date: "2026-10-10", timeSlot: ["10:00 AM", "2:00 PM"], setIds: ["s2"] });
    });

    it("treats a midnight end as the end of the day", () => {
        const parsed = parseBookingPrefill({ date: "2026-10-10", start: "20:00", end: "00:00" }, [], TODAY);
        expect(parsed.timeSlot).toEqual(["8:00 PM", "12:00 AM"]);
    });

    it("drops anything that the booking flow would reject", () => {
        expect(parseBookingPrefill({ date: "2026-10-01", start: "10:00", end: "12:00" }, [], TODAY)).toEqual({ date: null, timeSlot: null, setIds: [] });
        expect(parseBookingPrefill({ date: "2026-10-10", start: "10:15", end: "12:00" }, [], TODAY).timeSlot).toBeNull();
        expect(parseBookingPrefill({ date: "2026-10-10", sets: "unknown,s1" }, ["s1"], TODAY).setIds).toEqual(["s1"]);
        expect(parseBookingPrefill({}, ["s1"], TODAY)).toEqual({ date: null, timeSlot: null, setIds: [] });
    });
});
