import { addDaysToDateKey, isDateKey, istDateKey } from "@/lib/booking/dayAvailability";
import { REGIONS } from "@/lib/listing/regions";

/**
 * Rule-based reading of a customer's message: city, date, kind of shoot,
 * hours, people, hourly budget, start time. Pure functions with no database
 * or model behind them, used by the runtime (to save stated facts before the
 * model sees a message) and by the rule-based fallback.
 */

export const SHOOT_KEYWORDS: [RegExp, string, string][] = [
    [/\b(product|e-?commerce|catalog(?:ue)?|skincare|cosmetic|jewell?ery|packshot)\b/i, "product", "product shoot"],
    [/\b(fashion|lookbook|apparel|clothing|lifestyle|model shoot)\b/i, "fashion_lifestyle", "fashion shoot"],
    [/\b(food|beverage|restaurant|menu|recipe)\b/i, "food_beverage", "food shoot"],
    [/\b(portrait|headshot|editorial|portfolio)\b/i, "portrait_editorial", "portrait shoot"],
    [/\b(pre-?wedding|couple shoot)\b/i, "pre_wedding", "pre-wedding shoot"],
    [/\b(podcast|interview)\b/i, "podcast_interview", "podcast recording"],
    [/\b(reel|reels|ugc|youtube video|content creator)\b/i, "ugc_reels", "reels shoot"],
    [/\b(video|film|music video|ad film|commercial|tvc)\b/i, "video_film", "video shoot"],
    [/\b(event|party|pop-?up|launch)\b/i, "event_party", "event"],
    [/\b(workshop|class|masterclass)\b/i, "workshop_class", "workshop"],
    [/\b(recording|vocal|voice ?over|music)\b/i, "sound_recording", "recording session"],
];

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

const CITY_NAMES = REGIONS.flatMap((region) => region.cities).sort((a, b) => b.length - a.length);

export function findCity(text: string): string | undefined {
    const lower = text.toLowerCase();
    if (/\bncr\b/.test(lower)) return "Delhi";
    return CITY_NAMES.find((city) => new RegExp(`\\b${city.toLowerCase()}\\b`).test(lower));
}

export function findDate(text: string, now: Date = new Date()): string | undefined {
    const lower = text.toLowerCase();
    const today = istDateKey(now);
    const iso = lower.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0];
    if (iso && isDateKey(iso)) return iso;
    if (/\btoday\b/.test(lower)) return today;
    if (/\b(tomorrow|kal)\b/.test(lower)) return addDaysToDateKey(today, 1);
    if (/\bday after\b/.test(lower)) return addDaysToDateKey(today, 2);
    if (/\bweekend\b/.test(lower)) {
        const current = new Date(`${today}T00:00:00.000Z`).getUTCDay();
        return addDaysToDateKey(today, (6 - current + 7) % 7 || (current === 6 ? 0 : 7));
    }

    const weekday = WEEKDAYS.findIndex((name) => new RegExp(`\\b${name.slice(0, 3)}(?:${name.slice(3)})?\\b`).test(lower));
    if (weekday >= 0) {
        const current = new Date(`${today}T00:00:00.000Z`).getUTCDay();
        const ahead = (weekday - current + 7) % 7 || 7;
        return addDaysToDateKey(today, ahead);
    }

    // "14 dec", "14th december", "dec 14"
    const dayMonth = lower.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]{3})[a-z]*\b/) ?? null;
    const monthDay = lower.match(/\b([a-z]{3})[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?\b/) ?? null;
    const day = dayMonth ? Number(dayMonth[1]) : monthDay ? Number(monthDay[2]) : null;
    const month = MONTHS.indexOf(dayMonth ? dayMonth[2] : monthDay ? monthDay[1] : "");
    if (day && month >= 0) {
        const year = Number(today.slice(0, 4));
        const build = (y: number) => `${y}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const thisYear = build(year);
        const candidate = thisYear >= today ? thisYear : build(year + 1);
        if (isDateKey(candidate)) return candidate;
    }
    return undefined;
}

const AMOUNT = String.raw`(?:₹|rs\.?|inr)?\s?(\d[\d,]*(?:\.\d+)?)\s?(k|lakhs?|lacs?)?`;
const PER_HOUR = String.raw`\s*(?:\/|per|an|a|each)\s?(?:hr|hour)`;

const amountOf = (digits: string, unit?: string) => {
    const base = Number(digits.replace(/,/g, ""));
    const scale = !unit ? 1 : unit.toLowerCase() === "k" ? 1_000 : 100_000;
    return Number.isFinite(base) ? Math.round(base * scale) : NaN;
};

/** A budget figure with no "per hour" after it, e.g. "budget is 50k", "under 1500", "total 40,000 rupees". */
function looseBudget(text: string): number | undefined {
    const match = text.match(new RegExp(String.raw`(?:under|below|within|upto|up to|max(?:imum)?|budget(?:\s+(?:of|is|around|about))?|total(?:\s+(?:of|is))?|overall|all[- ]in)\s*${AMOUNT}\b(?!${PER_HOUR})`, "i"));
    const amount = match ? amountOf(match[1], match[2]) : NaN;
    return Number.isFinite(amount) ? amount : undefined;
}

/**
 * Hourly studio budget. Either said per hour ("2k an hour"), or a loose figure small enough
 * that it can only be an hourly rate: nobody shoots on a whole-day budget of ₹1,500.
 */
export function findBudgetPerHour(text: string): number | undefined {
    const explicit = text.match(new RegExp(`${AMOUNT}${PER_HOUR}`, "i"));
    const amount = explicit ? amountOf(explicit[1], explicit[2]) : looseBudget(text);
    if (amount === undefined || !Number.isFinite(amount)) return undefined;
    const limit = explicit ? 100_000 : HOURLY_CEILING;
    return amount >= 200 && amount <= limit ? amount : undefined;
}

/** Whole-shoot budget: a loose figure too large to be an hourly rate. */
export function findBudgetTotal(text: string): number | undefined {
    const amount = looseBudget(text);
    return amount !== undefined && amount > HOURLY_CEILING && amount <= 100_000_000 ? amount : undefined;
}

/** Above this, a figure given without "per hour" is read as the budget for the whole shoot. */
const HOURLY_CEILING = 6_000;

export const findHours = (text: string) => {
    const match = text.match(/\b(\d{1,2}(?:\.5)?)\s?(?:hours?|hrs?|h)\b/i);
    const hours = match ? Number(match[1]) : NaN;
    return hours >= 1 && hours <= 24 ? hours : undefined;
};

export const findPeople = (text: string) => {
    const match = text.match(/\b(\d{1,3})\s?(?:people|persons?|pax|members|crew)\b/i);
    const people = match ? Number(match[1]) : NaN;
    return people >= 1 && people <= 500 ? people : undefined;
};

/** "10:00 AM", "2pm", "14:30" → 24-hour HH:MM. */
export function findStartTime(text: string): string | undefined {
    const twelve = text.match(/\b(1[0-2]|0?[1-9])(?::([0-5]\d))?\s?(am|pm)\b/i);
    if (twelve) {
        const hour = (Number(twelve[1]) % 12) + (twelve[3].toLowerCase() === "pm" ? 12 : 0);
        return `${String(hour).padStart(2, "0")}:${twelve[2] ?? "00"}`;
    }
    const twentyFour = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
    return twentyFour ? `${twentyFour[1].padStart(2, "0")}:${twentyFour[2]}` : undefined;
}

/**
 * What a message states outright about the shoot, read by rule: city, date,
 * kind of shoot, hours, people, hourly budget. The runtime applies this before
 * the model sees the message, so the brief is right even when a small model
 * forgets to save it or gets a weekday's date wrong.
 */
export function extractBriefPatch(text: string, now: Date = new Date()) {
    const shoot = SHOOT_KEYWORDS.find(([pattern]) => pattern.test(text));
    const patch = {
        city: findCity(text),
        date: findDate(text, now),
        shoot_type: shoot?.[2],
        hours: findHours(text),
        people: findPeople(text),
        budget_per_hour: findBudgetPerHour(text),
        budget_total: findBudgetTotal(text),
    };
    return Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined));
}
