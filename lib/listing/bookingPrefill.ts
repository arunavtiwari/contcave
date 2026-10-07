import { addDaysToDateKey, BOOKING_HORIZON_DAYS, isDateKey, minutesToClock, minutesToLabel, SLOT_MINUTES } from "@/lib/booking/dayAvailability";
import { asEndOfDayMinutes, labelToMinutes } from "@/lib/scheduling";

const BOOKING_PREFILL_PARAMS = { date: "date", start: "start", end: "end", sets: "sets" } as const;

export function bookingPrefillQuery(prefill: { date: string; start: number | null; end: number | null; setIds: string[] }) {
    const params = new URLSearchParams({ [BOOKING_PREFILL_PARAMS.date]: prefill.date });
    if (prefill.start !== null && prefill.end !== null) {
        params.set(BOOKING_PREFILL_PARAMS.start, minutesToClock(prefill.start));
        params.set(BOOKING_PREFILL_PARAMS.end, minutesToClock(prefill.end));
    }
    if (prefill.setIds.length) params.set(BOOKING_PREFILL_PARAMS.sets, prefill.setIds.join(","));
    return params.toString();
}

export type BookingPrefill = { date: string | null; timeSlot: [string, string] | null; setIds: string[] };

const onGrid = (minutes: number) => Number.isFinite(minutes) && minutes % SLOT_MINUTES === 0;

export function parseBookingPrefill(
    params: Record<string, string | string[] | undefined>,
    listingSetIds: string[],
    today: string,
): BookingPrefill {
    const read = (key: string) => {
        const value = params[key];
        return Array.isArray(value) ? value[0] : value;
    };
    const rawDate = read(BOOKING_PREFILL_PARAMS.date);
    const date = rawDate && isDateKey(rawDate) && rawDate >= today && rawDate <= addDaysToDateKey(today, BOOKING_HORIZON_DAYS)
        ? rawDate
        : null;
    const start = labelToMinutes(read(BOOKING_PREFILL_PARAMS.start));
    const end = asEndOfDayMinutes(labelToMinutes(read(BOOKING_PREFILL_PARAMS.end)));
    const timeSlot: [string, string] | null = date && onGrid(start) && onGrid(end) && end > start
        ? [minutesToLabel(start), minutesToLabel(end)]
        : null;
    const setIds = Array.from(new Set((read(BOOKING_PREFILL_PARAMS.sets) ?? "").split(",").filter((id) => listingSetIds.includes(id))));
    return { date, timeSlot, setIds };
}
