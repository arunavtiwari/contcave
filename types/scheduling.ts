// types/scheduling.ts
export const DAY_KEYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export type DayKey = typeof DAY_KEYS[number];

export type TimeHM = `${number}${number}:${number}${number}`;
export type TimeLabel = string;

export type OpeningHours = { start: string; end: string };
export type OperationalDays = { start: DayKey; end: DayKey } | { days: DayKey[] };

export type ReservationOperationalTimings = {
    operationalHours?: OpeningHours;
    operationalDays?: OperationalDays;
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

export const normalizeOperationalDays = (input: any): OperationalDays | undefined => {
    if (!input) return undefined;

    if (Array.isArray(input?.days)) {
        const days = input.days.map(toDayKey).filter(Boolean) as DayKey[];
        return days.length ? { days } : undefined;
    }
    const s = toDayKey(input?.start);
    const e = toDayKey(input?.end);
    return s && e ? { start: s, end: e } : undefined;
};

export const normalizeOpeningHours = (input: any): OpeningHours | undefined => {
    if (!input) return undefined;
    return {
        start: String(input.start ?? ""),
        end: String(input.end ?? ""),
    };
};

/** Build the exact prop `ListingReservation` expects */
export const buildOperationalTimings = (listing: any): ReservationOperationalTimings => {
    const operationalDays =
        normalizeOperationalDays(listing?.operationalDays) ??
        ({ start: "Mon", end: "Sun" } as const);

    const operationalHours =
        normalizeOpeningHours(listing?.operationalHours) ??
        ({ start: "", end: "" } as const);

    return { operationalDays, operationalHours };
};
