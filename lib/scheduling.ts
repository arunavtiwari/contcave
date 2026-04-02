import { TimeHM } from "@/types/scheduling";

const IST_OFFSET_MIN = 5 * 60 + 30;

export const toISTDateParts = (d: Date) => {
    const utc = d.getTime() + d.getTimezoneOffset() * 60000;
    const ist = new Date(utc + IST_OFFSET_MIN * 60000);
    return {
        y: ist.getFullYear(),
        m: ist.getMonth(),
        d: ist.getDate(),
        hh: ist.getHours(),
        mm: ist.getMinutes(),
    };
};

export const istSameDay = (a: Date, b: Date) => {
    const A = toISTDateParts(a);
    const B = toISTDateParts(b);
    return A.y === B.y && A.m === B.m && A.d === B.d;
};

export const istToDateOnly = (d: Date) => {
    const p = toISTDateParts(d);
    return new Date(p.y, p.m, p.d);
};

export const parseLabel = (label: string) => {
    const m = label.match(/^\s*(\d{1,2}):(\d{2})\s*(AM|PM)\s*$/i);
    if (!m) return { hours: 0, minutes: 0 };
    let h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    const period = m[3].toUpperCase();
    if (period === "PM" && h < 12) h += 12;
    if (period === "AM" && h === 12) h = 0;
    return { hours: h, minutes: min };
};

export const dateFromLabel = (base: Date, label: string) => {
    const { hours, minutes } = parseLabel(label);
    return new Date(
        base.getFullYear(),
        base.getMonth(),
        base.getDate(),
        hours,
        minutes,
        0,
        0
    );
};

export const hhmmToMinutes = (hm: TimeHM) => {
    const [h, m] = hm.split(":").map((n) => parseInt(n, 10));
    return h * 60 + m;
};

export const ampmToMinutes = (label: string): number => {
    const m = label.match(/^(\d{1,2}):([0-5]\d)\s*(AM|PM)$/i);
    if (!m) return NaN;
    let h = Number(m[1]);
    const min = Number(m[2]);
    const period = m[3].toUpperCase();
    if (period === "PM" && h < 12) h += 12;
    if (period === "AM" && h === 12) h = 0;
    return h * 60 + min;
};

export const labelToMinutes = (s?: string | null): number => {
    if (!s) return NaN;
    const m12 = ampmToMinutes(s);
    if (!Number.isNaN(m12)) return m12;
    const m24 = s.match(/^(\d{1,2}):([0-5]\d)$/);
    return m24 ? Number(m24[1]) * 60 + Number(m24[2]) : NaN;
};

/** Treat midnight (0 min) as end-of-day (1440 min) when used as a range end boundary. */
export const asEndOfDayMinutes = (minutes: number): number =>
    minutes === 0 ? 1440 : minutes;

export const getRoundedNowIST_HHMM = (): TimeHM => {
    const parts = toISTDateParts(new Date());
    const roundUp = (15 - (parts.mm % 15)) % 15;
    const hh = (parts.hh + Math.floor((parts.mm + roundUp) / 60)) % 24;
    const mm = (parts.mm + roundUp) % 60;
    return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}` as TimeHM;
};

export const toHHMM = (input: unknown): TimeHM | null => {
    const fromDate = (d: Date): TimeHM | null => {
        if (!(d instanceof Date) || Number.isNaN(d.getTime())) return null;
        const hh = String(d.getHours()).padStart(2, "0");
        const mm = String(d.getMinutes()).padStart(2, "0");
        return `${hh}:${mm}` as TimeHM;
    };
    if (input instanceof Date) return fromDate(input);
    if (typeof input === "string") {
        const s = input.trim();
        if (!s) return null;
        const twelve = s.match(/^(\d{1,2}):([0-5]\d)\s*([AP]M)$/i);
        if (twelve) {
            let h = parseInt(twelve[1], 10);
            const m = twelve[2];
            const ap = twelve[3].toUpperCase();
            if (ap === "PM" && h < 12) h += 12;
            if (ap === "AM" && h === 12) h = 0;
            return `${String(h).padStart(2, "0")}:${m}` as TimeHM;
        }
        const twentyFour = s.match(/^([01]?\d|2[0-3]):([0-5]\d)(?::\d{2})?$/);
        if (twentyFour) {
            const h = parseInt(twentyFour[1], 10);
            const m = twentyFour[2];
            return `${String(h).padStart(2, "0")}:${m}` as TimeHM;
        }
        return fromDate(new Date(s));
    }
    return null;
};
