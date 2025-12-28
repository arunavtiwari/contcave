export const DAY_KEYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export type DayKey = typeof DAY_KEYS[number];

export type TimeHM = `${number}${number}:${number}${number}`;
export type TimeLabel = string;

export type OpeningHours = { start: string; end: string };
export type OperationalDays = { start: DayKey; end: DayKey } | { days: DayKey[] };

export type DayTiming = { open?: string; close?: string; enabled?: boolean };

export type ReservationOperationalTimings = {
    operationalHours?: OpeningHours;
    operationalDays?: OperationalDays;
    byDay?: DayTiming[];
};

// ---------------- Normalizers ----------------
const DAY_MAP: Record<string, DayKey> = {
    mon: "Mon", monday: "Mon",
    tue: "Tue", tues: "Tue", tuesday: "Tue",
    wed: "Wed", weds: "Wed", wednesday: "Wed",
    thu: "Thu", thur: "Thu", thurs: "Thu", thursday: "Thu",
    fri: "Fri", friday: "Fri",
    sat: "Sat", saturday: "Sat",
    sun: "Sun", sunday: "Sun",
};

export const toDayKey = (v: unknown): DayKey | undefined =>
    typeof v === "string" ? DAY_MAP[v.trim().toLowerCase()] : undefined;

type OperationalDaysInput = { days?: unknown[] } | { start?: unknown; end?: unknown } | null | undefined;

export const normalizeOperationalDays = (input: OperationalDaysInput): OperationalDays | undefined => {
    if (!input) return undefined;

    if (typeof input === 'object' && 'days' in input && Array.isArray(input.days)) {
        const days = input.days.map(toDayKey).filter(Boolean) as DayKey[];
        return days.length ? { days } : undefined;
    }
    if (typeof input === 'object' && 'start' in input && 'end' in input) {
        const s = toDayKey(input.start);
        const e = toDayKey(input.end);
        return s && e ? { start: s, end: e } : undefined;
    }
    return undefined;
};

type OpeningHoursInput = { start?: unknown; end?: unknown } | null | undefined;

export const normalizeOpeningHours = (input: OpeningHoursInput): OpeningHours | undefined => {
    if (!input || typeof input !== 'object') return undefined;
    return {
        start: String(input.start ?? ""),
        end: String(input.end ?? ""),
    };
};

type ListingInput = { operationalDays?: unknown; operationalHours?: unknown } | null | undefined;

const WEEK_DAYS: DayKey[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const buildOperationalTimings = (listing: ListingInput): ReservationOperationalTimings => {
    const operationalDays =
        normalizeOperationalDays(listing?.operationalDays as OperationalDaysInput) ??
        ({ start: "Mon", end: "Sun" } as const);

    const operationalHours =
        normalizeOpeningHours(listing?.operationalHours as OpeningHoursInput) ??
        ({ start: "", end: "" } as const);

    const byDay: DayTiming[] = WEEK_DAYS.map((day) => {
        let enabled = false;
        if ("days" in operationalDays) {
            enabled = operationalDays.days.includes(day);
        } else {
            const startIdx = DAY_KEYS.indexOf(operationalDays.start);
            const endIdx = DAY_KEYS.indexOf(operationalDays.end);
            const curIdx = DAY_KEYS.indexOf(day);
            if (startIdx <= endIdx) {
                enabled = curIdx >= startIdx && curIdx <= endIdx;
            } else {
                enabled = curIdx >= startIdx || curIdx <= endIdx;
            }
        }
        return {
            open: operationalHours.start,
            close: operationalHours.end,
            enabled,
        };
    });

    return { operationalDays, operationalHours, byDay };
};
