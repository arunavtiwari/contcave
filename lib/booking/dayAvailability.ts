import { TIME_SLOTS } from "@/constants/timeSlots";
import { asEndOfDayMinutes, labelToMinutes } from "@/lib/scheduling";
import type { CalendarBusyEvent } from "@/types/reservation";
import { toDayKey } from "@/types/scheduling";

const DEFAULT_MINIMUM_BOOKING_MINUTES = 90;
export const BOOKING_HORIZON_DAYS = 90;

const MINUTES_PER_DAY = 1440;
const MS_PER_MINUTE = 60_000;
const IST_OFFSET_MINUTES = 330;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const CONFIGURED_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const START_MINUTES = TIME_SLOTS.slice(0, -1).map(labelToMinutes);

export type MinuteRange = { start: number; end: number };

type BusyKind = "booking" | "block" | "calendar";
type BusyRange = MinuteRange & { kind: BusyKind };

export type DayEntry = { startTime: string; endTime: string; setIds?: string[] | null };

export type DayStatusInput = { listingActive: boolean; startTime?: string | null; endTime?: string | null };

export type ListingScheduleInput = {
    operationalDays?: unknown;
    operationalHours?: unknown;
    minimumBookingHours?: number | null;
    hasSets: boolean;
    setIds: string[];
};

export type DayAvailability = {
    date: string;
    hours: MinuteRange | null;
    closedBy: "day-status" | "schedule" | "misconfigured" | null;
    earliestStart: number;
    minimumMinutes: number;
    hasSets: boolean;
    setIds: string[];
    listingBusy: BusyRange[];
    setBusy: Record<string, BusyRange[]>;
};

export type SetRequirement = { eligibleSetIds?: string[]; minSets?: number };

export const minimumBookingMinutes = (minimumBookingHours?: number | null) => {
    const configured = Math.max(0, Number(minimumBookingHours || 0)) * 60;
    return configured > 0 ? configured : DEFAULT_MINIMUM_BOOKING_MINUTES;
};

export const isDateKey = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

export const dateKeyOf = (value: string | Date) =>
    typeof value === "string" ? value.slice(0, 10) : value.toISOString().slice(0, 10);

export const istDateKey = (instant: Date) =>
    new Date(instant.getTime() + IST_OFFSET_MINUTES * MS_PER_MINUTE).toISOString().slice(0, 10);

export const addDaysToDateKey = (dateKey: string, days: number) =>
    new Date(Date.parse(`${dateKey}T00:00:00.000Z`) + days * 1440 * MS_PER_MINUTE).toISOString().slice(0, 10);

const dayStartMs = (dateKey: string) => Date.parse(`${dateKey}T00:00:00+05:30`);

export const minutesToLabel = (minutes: number) => {
    const wrapped = minutes % MINUTES_PER_DAY;
    const hours = Math.floor(wrapped / 60);
    const period = hours >= 12 ? "PM" : "AM";
    return `${hours % 12 || 12}:${String(wrapped % 60).padStart(2, "0")} ${period}`;
};

const overlaps = (start: number, end: number, ranges: MinuteRange[]) =>
    ranges.some((range) => range.start < end && start < range.end);

const parseRange = (startTime?: string | null, endTime?: string | null): MinuteRange | null => {
    const start = labelToMinutes(startTime);
    const end = asEndOfDayMinutes(labelToMinutes(endTime));
    return Number.isFinite(start) && Number.isFinite(end) && end > start ? { start, end } : null;
};

function isOperationalWeekday(operationalDays: unknown, dateKey: string) {
    if (!operationalDays || typeof operationalDays !== "object" || Array.isArray(operationalDays)) return true;
    const weekday = WEEKDAYS[new Date(`${dateKey}T12:00:00+05:30`).getUTCDay()];
    const config = operationalDays as { days?: unknown[]; start?: unknown; end?: unknown };

    if (Array.isArray(config.days)) return config.days.map(toDayKey).includes(weekday);

    const start = config.start === undefined ? "Mon" : toDayKey(config.start);
    const end = config.end === undefined ? "Sun" : toDayKey(config.end);
    if (!start || !end) return true;
    const startIndex = CONFIGURED_WEEK.indexOf(start);
    const endIndex = CONFIGURED_WEEK.indexOf(end);
    const index = CONFIGURED_WEEK.indexOf(weekday);
    return startIndex <= endIndex
        ? index >= startIndex && index <= endIndex
        : index >= startIndex || index <= endIndex;
}

function openingHours(start?: unknown, end?: unknown): MinuteRange | null {
    const open = labelToMinutes(typeof start === "string" ? start : "");
    const rawClose = labelToMinutes(typeof end === "string" ? end : "");
    if (!Number.isFinite(open) || !Number.isFinite(rawClose) || (open === 0 && rawClose === 0)) {
        return { start: 0, end: MINUTES_PER_DAY };
    }
    const close = asEndOfDayMinutes(rawClose);
    return close > open ? { start: open, end: close } : null;
}

function resolveHours(listing: ListingScheduleInput, dayStatus: DayStatusInput | null | undefined, dateKey: string) {
    if (dayStatus) {
        if (!dayStatus.listingActive) return { hours: null, closedBy: "day-status" as const };
        const hours = openingHours(dayStatus.startTime, dayStatus.endTime);
        return { hours, closedBy: hours ? null : ("misconfigured" as const) };
    }
    if (!isOperationalWeekday(listing.operationalDays, dateKey)) return { hours: null, closedBy: "schedule" as const };
    const configured = listing.operationalHours as { start?: unknown; end?: unknown } | null | undefined;
    const hours = configured && typeof configured === "object" && !Array.isArray(configured)
        ? openingHours(configured.start, configured.end)
        : { start: 0, end: MINUTES_PER_DAY };
    return { hours, closedBy: hours ? null : ("misconfigured" as const) };
}

function calendarBusyForDate(events: CalendarBusyEvent[], dateKey: string): MinuteRange[] {
    const dayStart = dayStartMs(dateKey);
    const dayEnd = dayStart + MINUTES_PER_DAY * MS_PER_MINUTE;
    const busy: MinuteRange[] = [];

    for (const event of events) {
        const allDayStart = event.start?.date;
        if (allDayStart) {
            const allDayEnd = event.end?.date && event.end.date > allDayStart ? event.end.date : addDaysToDateKey(allDayStart, 1);
            if (allDayStart <= dateKey && dateKey < allDayEnd) busy.push({ start: 0, end: MINUTES_PER_DAY });
            continue;
        }
        const start = Date.parse(event.start?.dateTime ?? "");
        const end = Date.parse(event.end?.dateTime ?? "");
        if (!Number.isFinite(start) || !Number.isFinite(end) || end <= dayStart || start >= dayEnd) continue;
        const from = Math.max(0, Math.floor((start - dayStart) / MS_PER_MINUTE));
        const to = Math.min(MINUTES_PER_DAY, Math.ceil((end - dayStart) / MS_PER_MINUTE));
        if (to > from) busy.push({ start: from, end: to });
    }

    return busy;
}

export function buildDayAvailability(input: {
    date: string;
    listing: ListingScheduleInput;
    dayStatus?: DayStatusInput | null;
    bookings: DayEntry[];
    blocks: DayEntry[];
    calendarBusy?: MinuteRange[];
    now: Date;
}): DayAvailability {
    const { date, listing, now } = input;
    const { hours, closedBy } = resolveHours(listing, input.dayStatus, date);
    const today = istDateKey(now);
    const nowMinutes = Math.floor((now.getTime() - dayStartMs(today)) / MS_PER_MINUTE);
    const earliestStart = date < today ? MINUTES_PER_DAY : date === today ? nowMinutes + 1 : 0;

    const listingBusy: BusyRange[] = (input.calendarBusy ?? []).map((range) => ({ ...range, kind: "calendar" }));
    const setBusy: Record<string, BusyRange[]> = {};

    const addEntries = (entries: DayEntry[], kind: BusyKind) => {
        for (const entry of entries) {
            const range = parseRange(entry.startTime, entry.endTime);
            const busy: BusyRange = range ? { ...range, kind } : { start: 0, end: MINUTES_PER_DAY, kind };
            const setIds = entry.setIds ?? [];
            if (!range || !listing.hasSets || setIds.length === 0) {
                listingBusy.push(busy);
                continue;
            }
            for (const setId of setIds) (setBusy[setId] ??= []).push(busy);
        }
    };
    addEntries(input.blocks, "block");
    addEntries(input.bookings, "booking");

    return {
        date,
        hours,
        closedBy,
        earliestStart,
        minimumMinutes: minimumBookingMinutes(listing.minimumBookingHours),
        hasSets: listing.hasSets && listing.setIds.length > 0,
        setIds: listing.setIds,
        listingBusy,
        setBusy,
    };
}

type Dated = { date: string | Date };

export function dayAvailabilityFromRecords(input: {
    date: string;
    listing: ListingScheduleInput;
    dayStatuses: (DayStatusInput & Dated)[];
    reservations: (DayEntry & Dated)[];
    blocks: (DayEntry & Dated)[];
    calendarEvents?: CalendarBusyEvent[];
    now: Date;
}): DayAvailability {
    const onDate = <T extends Dated>(rows: T[]) => rows.filter((row) => dateKeyOf(row.date) === input.date);
    return buildDayAvailability({
        date: input.date,
        listing: input.listing,
        dayStatus: onDate(input.dayStatuses)[0] ?? null,
        bookings: onDate(input.reservations),
        blocks: onDate(input.blocks),
        calendarBusy: calendarBusyForDate(input.calendarEvents ?? [], input.date),
        now: input.now,
    });
}

const BUSY_MESSAGES: Record<BusyKind, string> = {
    booking: "This time slot is already booked.",
    block: "This time slot is blocked.",
    calendar: "This time slot overlaps with a connected Google Calendar event.",
};

export function checkWindow(
    day: DayAvailability,
    window: {
        start: number;
        end: number;
        setIds: string[];
        packageMinutes?: number | null;
        enforceMinimum?: boolean;
        enforcePast?: boolean;
    }
): string | null {
    const { start, end, setIds, enforceMinimum = true, enforcePast = true } = window;
    if (!isDateKey(day.date)) return "Please choose a valid booking date.";
    if (!Number.isFinite(start) || !Number.isFinite(end)) return "Please choose a valid start and end time.";
    if (end <= start) return "End time must be after start time.";

    const duration = end - start;
    if (enforceMinimum && duration < day.minimumMinutes) {
        const hours = day.minimumMinutes / 60;
        return `Minimum booking duration is ${hours} hour${hours === 1 ? "" : "s"}.`;
    }
    const packageMinutes = Math.max(0, Number(window.packageMinutes || 0));
    if (packageMinutes > 0 && duration !== packageMinutes) return "Selected time slot must match the package duration.";

    if (!day.hours) {
        return day.closedBy === "misconfigured"
            ? "This studio's operational hours are not configured correctly."
            : "This studio is not accepting bookings on the selected date.";
    }
    if (start < day.hours.start || end > day.hours.end) return "Selected time slot is outside this studio's operational hours.";
    if (enforcePast && start < day.earliestStart) return "Past time slots are not available for booking.";

    const listingConflict = day.listingBusy.find((range) => range.start < end && start < range.end);
    if (listingConflict) return BUSY_MESSAGES[listingConflict.kind];
    for (const setId of setIds) {
        const conflict = (day.setBusy[setId] ?? []).find((range) => range.start < end && start < range.end);
        if (conflict) {
            return conflict.kind === "block"
                ? "Selected sets are blocked during this time."
                : "One or more selected sets are already booked during this time.";
        }
    }
    return null;
}

export function freeSetIds(day: DayAvailability, start: number, end: number) {
    if (overlaps(start, end, day.listingBusy)) return [];
    return day.setIds.filter((setId) => !overlaps(start, end, day.setBusy[setId] ?? []));
}

const eligibleSetsOf = (day: DayAvailability, requirement: SetRequirement) => {
    const eligible = requirement.eligibleSetIds?.length
        ? day.setIds.filter((setId) => requirement.eligibleSetIds!.includes(setId))
        : day.setIds;
    return { eligible, minSets: Math.max(1, Number(requirement.minSets || 1)) };
};

function bookableStarts(day: DayAvailability, requiredMinutes: number, requirement: SetRequirement = {}) {
    if (!day.hours) return [];
    const { eligible, minSets } = eligibleSetsOf(day, requirement);

    return START_MINUTES.filter((start) => {
        const end = start + requiredMinutes;
        if (start < day.hours!.start || end > day.hours!.end || start < day.earliestStart) return false;
        if (overlaps(start, end, day.listingBusy)) return false;
        if (!day.hasSets) return true;
        return eligible.filter((setId) => !overlaps(start, end, day.setBusy[setId] ?? [])).length >= minSets;
    });
}

function requiredMinutesFor(day: DayAvailability, packageDurationHours?: number | null) {
    const packageMinutes = Math.max(0, Number(packageDurationHours || 0)) * 60;
    if (packageMinutes === 0) return day.minimumMinutes;
    return packageMinutes >= day.minimumMinutes ? packageMinutes : null;
}

export function isBookable(day: DayAvailability, packageDurationHours?: number | null, requirement: SetRequirement = {}) {
    const required = requiredMinutesFor(day, packageDurationHours);
    return required !== null && bookableStarts(day, required, requirement).length > 0;
}

export function busyRanges(day: DayAvailability, selection: { setIds?: string[] } & SetRequirement = {}): MinuteRange[] {
    if (!day.hours) return [{ start: 0, end: MINUTES_PER_DAY }];

    const ranges: MinuteRange[] = [...day.listingBusy];
    if (day.hours.start > 0) ranges.push({ start: 0, end: day.hours.start });
    if (day.hours.end < MINUTES_PER_DAY) ranges.push({ start: day.hours.end, end: MINUTES_PER_DAY });
    if (day.earliestStart > 0) ranges.push({ start: 0, end: Math.min(day.earliestStart, MINUTES_PER_DAY) });

    if (day.hasSets) {
        if (selection.setIds?.length) {
            for (const setId of selection.setIds) ranges.push(...(day.setBusy[setId] ?? []));
        } else {
            const { eligible, minSets } = eligibleSetsOf(day, selection);
            const points = Array.from(new Set([0, MINUTES_PER_DAY, ...eligible.flatMap((setId) =>
                (day.setBusy[setId] ?? []).flatMap((range) => [range.start, range.end]))])).sort((a, b) => a - b);
            for (let index = 0; index < points.length - 1; index++) {
                const [from, to] = [points[index], points[index + 1]];
                const free = eligible.filter((setId) => !overlaps(from, to, day.setBusy[setId] ?? [])).length;
                if (free < minSets) ranges.push({ start: from, end: to });
            }
        }
    }

    const merged: MinuteRange[] = [];
    for (const range of ranges.map(({ start, end }) => ({ start, end })).sort((a, b) => a.start - b.start)) {
        const last = merged[merged.length - 1];
        if (last && range.start <= last.end) last.end = Math.max(last.end, range.end);
        else merged.push(range);
    }
    return merged;
}
