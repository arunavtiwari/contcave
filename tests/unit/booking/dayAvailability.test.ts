import { describe, expect, it } from "vitest";

import { buildDayAvailability, checkExtensionWindow, checkWindow, isBookable } from "@/lib/booking/dayAvailability";

describe("availability engine", () => {
    it("applies the booking rules", () => {
        const now = new Date("2026-10-01T06:00:00Z");
        const listing = { operationalHours: { start: "9:00 AM", end: "9:00 PM" }, minimumBookingHours: 2, hasSets: false, setIds: [] };
        const day = buildDayAvailability({ date: "2026-10-05", listing, bookings: [], blocks: [], now });

        expect(isBookable(day, 1)).toBe(false);
        expect(isBookable(day, 3)).toBe(true);
        expect(checkWindow(day, { start: 600, end: 720, setIds: [], packageMinutes: 180 })).toBe("Selected time slot must match the package duration.");
        expect(checkWindow(day, { start: 480, end: 600, setIds: [] })).toBe("Selected time slot is outside this studio's operational hours.");

        const special = buildDayAvailability({
            date: "2026-10-05",
            listing,
            dayStatus: { listingActive: true, startTime: "06:00", endTime: "08:00" },
            bookings: [],
            blocks: [],
            now,
        });
        expect(checkWindow(special, { start: 360, end: 480, setIds: [] })).toBeNull();

        const today = buildDayAvailability({ date: "2026-10-01", listing, bookings: [], blocks: [], now });
        expect(checkWindow(today, { start: 660, end: 780, setIds: [] })).toBe("Past time slots are not available for booking.");
        expect(checkWindow(today, { start: 720, end: 840, setIds: [] })).toBeNull();
    });

    it("lets running sessions extend until closing time", () => {
        const now = new Date("2026-10-01T06:00:00Z");
        const listing = {
            operationalDays: { start: "Mon", end: "Fri" },
            operationalHours: { start: "9:00 AM", end: "9:00 PM" },
            minimumBookingHours: 2,
            hasSets: false,
            setIds: [],
        };
        const monday = buildDayAvailability({ date: "2026-10-05", listing, bookings: [{ startTime: "8:00 PM", endTime: "8:30 PM" }], blocks: [], now });

        expect(checkWindow(monday, { start: 315, end: 435, setIds: [] })).toBe("Selected time slot is outside this studio's operational hours.");
        expect(checkExtensionWindow(monday, { start: 405, end: 435, setIds: [] })).toBeNull();
        expect(checkExtensionWindow(monday, { start: 1110, end: 1170, setIds: [] })).toBeNull();
        expect(checkExtensionWindow(monday, { start: 1170, end: 1230, setIds: [] })).toBe("This time slot is already booked.");
        expect(checkExtensionWindow(monday, { start: 1230, end: 1290, setIds: [] })).toBe("Extensions cannot continue past the studio's operating hours.");

        const sunday = buildDayAvailability({ date: "2026-10-04", listing, bookings: [], blocks: [], now });
        expect(checkWindow(sunday, { start: 600, end: 720, setIds: [] })).toBe("This studio is not accepting bookings on the selected date.");
        expect(checkExtensionWindow(sunday, { start: 600, end: 630, setIds: [] })).toBeNull();

        const switchedOff = buildDayAvailability({
            date: "2026-10-05",
            listing,
            dayStatus: { listingActive: false, startTime: "", endTime: "" },
            bookings: [],
            blocks: [],
            now,
        });
        expect(checkExtensionWindow(switchedOff, { start: 600, end: 630, setIds: [] })).toBe("Extensions cannot continue past the studio's operating hours.");

        const today = buildDayAvailability({ date: "2026-10-01", listing, bookings: [], blocks: [], now });
        expect(checkExtensionWindow(today, { start: 600, end: 630, setIds: [] })).toBeNull();
    });
});
