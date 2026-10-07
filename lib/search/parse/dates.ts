import { addDaysToDateKey, BOOKING_HORIZON_DAYS, isDateKey } from "@/lib/booking/dayAvailability";
import { SEARCH_CONFIG } from "@/lib/search/config";

export type ParsedDates = { dates: string[]; flexible: boolean; inferred: boolean; dropped: "past" | "horizon" | null };

const WEEKDAY_PATTERNS: [number, string][] = [
    [0, "sunday|(?:on|this|next|coming|upcoming) sun"],
    [1, "monday|mon"],
    [2, "tuesday|tues|tue"],
    [3, "wednesday|wed"],
    [4, "thursday|thurs|thur|thu"],
    [5, "friday|fri"],
    [6, "saturday|sat"],
];

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const MONTH_PATTERN = "(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
const DAY_PATTERN = "(\\d{1,2})(?:st|nd|rd|th)?";
const FLEXIBLE_PATTERN = /\b(flexible|any ?day|anytime|any time|whenever|sometime|next month|this month)\b/;

const weekdayOf = (dateKey: string) => new Date(`${dateKey}T12:00:00.000Z`).getUTCDay();

const monthIndex = (token: string) => MONTHS.indexOf(token.slice(0, 3));

function dateFromParts(day: number, month: number, year: number | null, today: string) {
    const thisYear = Number(today.slice(0, 4));
    const build = (y: number) => `${y}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (year !== null) {
        const fullYear = year < 100 ? 2000 + year : year;
        const key = build(fullYear);
        return isDateKey(key) ? key : null;
    }
    const candidate = build(thisYear);
    if (!isDateKey(candidate)) return null;
    return candidate >= today ? candidate : build(thisYear + 1);
}

function weekdayDates(text: string, today: string) {
    const dates: string[] = [];
    let inferred = false;
    const todayWeekday = weekdayOf(today);
    for (const [weekday, names] of WEEKDAY_PATTERNS) {
        const match = text.match(new RegExp(`\\b(next|coming|this|upcoming|on)?\\s?(?:${names})\\b`));
        if (!match) continue;
        const delta = (weekday - todayWeekday + 7) % 7;
        const isNext = /^next\b/.test(match[0].trim());
        dates.push(addDaysToDateKey(today, isNext && delta === 0 ? 7 : delta));
        if (isNext) inferred = true;
    }
    return { dates, inferred };
}

function weekendDates(text: string, today: string) {
    const match = text.match(/\b(this|next|coming)?\s?weekend\b/);
    if (!match) return null;
    const todayWeekday = weekdayOf(today);
    const toSaturday = todayWeekday === 0 ? -1 : (6 - todayWeekday + 7) % 7;
    const offset = match[1] === "next" ? 7 : 0;
    const saturday = addDaysToDateKey(today, toSaturday + offset);
    const days = [saturday, addDaysToDateKey(saturday, 1)].filter((key) => key >= today);
    return { dates: days, inferred: match[1] === "next" };
}

function explicitDates(text: string, today: string) {
    const dates: string[] = [];
    const push = (key: string | null) => key && dates.push(key);
    const yearOf = (raw?: string) => (raw ? Number(raw) : null);

    for (const match of text.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b/g)) push(isDateKey(match[0]) ? match[0] : null);

    const dayMonthRange = new RegExp(`\\b${DAY_PATTERN}\\s?(?:-|to)\\s?${DAY_PATTERN}\\s${MONTH_PATTERN}(?:\\s(\\d{4}))?\\b`, "g");
    for (const match of text.matchAll(dayMonthRange)) {
        const [from, to, month, year] = [Number(match[1]), Number(match[2]), monthIndex(match[3]), yearOf(match[4])];
        for (let day = from; day <= to && dates.length < SEARCH_CONFIG.maxDates; day++) push(dateFromParts(day, month, year, today));
    }

    const dayMonth = new RegExp(`\\b${DAY_PATTERN}\\s${MONTH_PATTERN}(?:\\s(\\d{4}))?\\b`, "g");
    for (const match of text.matchAll(dayMonth)) push(dateFromParts(Number(match[1]), monthIndex(match[2]), yearOf(match[3]), today));

    const withoutDayMonth = text.replace(dayMonthRange, " ").replace(dayMonth, " ");
    const monthDay = new RegExp(`\\b${MONTH_PATTERN}\\s${DAY_PATTERN}\\b(?:\\s(\\d{4}))?`, "g");
    for (const match of withoutDayMonth.matchAll(monthDay)) push(dateFromParts(Number(match[2]), monthIndex(match[1]), yearOf(match[3]), today));

    const numericDates = [
        /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2}|\d{4}))?(?![\d/])/g,
        /\b(\d{1,2})[.-](\d{1,2})[.-](\d{2}|\d{4})\b/g,
    ];
    for (const pattern of numericDates) {
        for (const match of text.matchAll(pattern)) {
            const [day, month] = [Number(match[1]), Number(match[2]) - 1];
            if (month >= 0 && month < 12) push(dateFromParts(day, month, yearOf(match[3]), today));
        }
    }

    return dates;
}

function relativeDates(text: string, today: string) {
    if (/\b(day after tomorrow|parso|parson)\b/.test(text)) return [addDaysToDateKey(today, 2)];
    if (/\b(tomorrow|tmrw|tmr|kal)\b/.test(text)) return [addDaysToDateKey(today, 1)];
    if (/\b(today|aaj|tonight)\b/.test(text)) return [today];
    return [];
}

export function parseDates(text: string, today: string): ParsedDates {
    const weekend = weekendDates(text, today);
    const weekdays = weekend ? { dates: [], inferred: false } : weekdayDates(text, today);
    const candidates = [
        ...relativeDates(text, today),
        ...(weekend?.dates ?? []),
        ...weekdays.dates,
        ...explicitDates(text, today),
    ];

    const horizon = addDaysToDateKey(today, BOOKING_HORIZON_DAYS);
    const unique = Array.from(new Set(candidates)).sort();
    const valid = unique.filter((key) => key >= today && key <= horizon).slice(0, SEARCH_CONFIG.maxDates);
    const dropped = unique.length === valid.length ? null : unique.some((key) => key < today) ? "past" : "horizon";

    return {
        dates: valid,
        flexible: FLEXIBLE_PATTERN.test(text) && valid.length === 0,
        inferred: Boolean(weekend?.inferred || weekdays.inferred),
        dropped,
    };
}
