import { busyRanges, checkWindow, type DayAvailability, MINUTES_PER_DAY, SLOT_MINUTES } from "@/lib/booking/dayAvailability";

import type { AvailabilityFacts, DayWindow } from "./types";

const MAX_WINDOWS = 2;

const roundUpToSlot = (minutes: number) => Math.ceil(minutes / SLOT_MINUTES) * SLOT_MINUTES;

export function freeWindows(day: DayAvailability, durationMinutes: number, setIds: string[]): DayWindow[] {
    const required = Math.max(durationMinutes, day.minimumMinutes);
    const windows: DayWindow[] = [];
    let cursor = 0;
    for (const busy of [...busyRanges(day, { setIds }), { start: MINUTES_PER_DAY, end: MINUTES_PER_DAY }]) {
        const start = roundUpToSlot(cursor);
        if (busy.start - start >= required) windows.push({ start, end: busy.start });
        cursor = Math.max(cursor, busy.end);
    }
    return windows;
}

export function summarizeAvailability(
    days: DayAvailability[],
    request: { start: number | null; durationMinutes: number; setIds: string[] },
): AvailabilityFacts {
    const freeDates: string[] = [];
    const busyDates: string[] = [];
    let windows: DayWindow[] = [];

    for (const day of days) {
        const duration = Math.max(request.durationMinutes, day.minimumMinutes);
        const dayWindows = request.start === null
            ? freeWindows(day, duration, request.setIds)
            : checkWindow(day, { start: request.start, end: request.start + duration, setIds: request.setIds }) === null
                ? [{ start: request.start, end: request.start + duration }]
                : [];
        if (dayWindows.length === 0) {
            busyDates.push(day.date);
            continue;
        }
        freeDates.push(day.date);
        if (!windows.length) windows = dayWindows.slice(0, MAX_WINDOWS);
    }

    return {
        checked: days.length > 0,
        freeDates,
        busyDates,
        windows,
        suggestedStart: windows[0]?.start ?? null,
    };
}
