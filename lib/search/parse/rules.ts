import { parseDates } from "@/lib/search/parse/dates";
import { tokenize } from "@/lib/search/rank";
import { extractTerms, normalizeText } from "@/lib/search/vocabulary";
import { EMPTY_QUERY, type ParsedQuery, type QueryField, sanitizeQuery } from "@/schemas/search";

const SUFFIX = "(?:(k|thousand|grand|lakhs|lakh|lacs|lac|l)(?![a-z]))?";
const AMOUNT = `(?:₹|rs\\.?|inr)?\\s?(\\d+(?:\\.\\d+)?)\\s?${SUFFIX}`;
const HOURLY_SUFFIX = /^\s?(?:\/\s?(?:hr|hour|h)|per\s(?:hr|hour)|an hour|a hour|hourly|ph)\b/;
const UPPER_BOUND = /(under|below|upto|up to|max|maximum|within|less than|not more than|around|approx|about|budget(?: of| is)?)\s?$/;
const LOWER_BOUND = /(above|over|min|minimum|at least|more than)\s?$/;
const SUFFIX_MULTIPLIER: Record<string, number> = {
    k: 1_000,
    thousand: 1_000,
    grand: 1_000,
    l: 100_000,
    lakh: 100_000,
    lakhs: 100_000,
    lac: 100_000,
    lacs: 100_000,
};
const NUMBER_WORDS: Record<string, number> = {
    one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    eleven: 11, twelve: 12, fifteen: 15, twenty: 20, thirty: 30, forty: 40, fifty: 50,
};
const NUMBER_WORD_PATTERN = new RegExp(`\\b(${Object.keys(NUMBER_WORDS).join("|")})\\b`, "g");

const withDigits = (text: string) => text.replace(NUMBER_WORD_PATTERN, (word) => String(NUMBER_WORDS[word]));
const UNDERSTOOD_WORDS = new Set([
    "people", "persons", "person", "ppl", "pax", "crew", "members", "member", "log", "guests", "models", "heads", "folks", "team", "group",
    "hours", "hour", "hrs", "hr", "ghante", "ghanta", "half", "full", "whole", "day", "aadha", "poora", "pura", "din",
    "budget", "under", "below", "upto", "up", "max", "maximum", "within", "less", "than", "not", "more", "above", "over", "min", "minimum",
    "least", "approx", "about", "rs", "inr", "thousand", "grand", "lakh", "lakhs", "lac", "lacs", "per", "hourly", "ph", "tak",
    "today", "tomorrow", "tmrw", "tmr", "kal", "parso", "parson", "aaj", "tonight", "after", "next", "this", "coming", "upcoming", "weekend",
    "sunday", "sun", "monday", "mon", "tuesday", "tue", "tues", "wednesday", "wed", "thursday", "thu", "thur", "thurs", "friday", "fri",
    "saturday", "sat", "jan", "january", "feb", "february", "mar", "march", "apr", "april", "jun", "june", "jul", "july", "aug", "august",
    "sep", "sept", "september", "oct", "october", "nov", "november", "dec", "december", "st", "nd", "rd", "th", "flexible", "anytime",
    "any", "sometime", "whenever", "month", "am", "pm", "till", "until", "by", "starting", "studio", "studios", "space", "shoot",
    "shooting", "photoshoot", "book", "booking", "rent", "karna", "karni", "want", "need", "looking", "also", "only", "some", "ek", "ki", "ke",
    "vibe", "vibes", "look", "looks", "feel", "style", "aesthetic", "setup", "set",
]);

const NON_SEARCH = /\b(refund|cancel|cancellation|invoice|payment failed|login|log in|password|otp|account|support|complaint|help with my booking)\b/;
const AREA_LEAD = /\b(?:in|near|nearby|around|at|close to|closer to)\s+([a-z][a-z0-9-]*(?:\s+[a-z0-9-]+){0,3})/g;
const AREA_STOP = new Set([
    "for", "with", "on", "from", "to", "and", "or", "between", "by", "the", "a", "an", "my", "our", "only",
    "studio", "studios", "morning", "evening", "afternoon", "night",
    "need", "needs", "want", "looking", "chahiye", "mein", "ke", "ka", "ki", "liye",
]);

const NUMBERED_PLACES = new Set(["sector", "phase", "block", "pocket", "plot", "gate", "stage"]);

const titleCase = (text: string) => text.replace(/\b[a-z]/g, (letter) => letter.toUpperCase());

const isCityName = (phrase: string) => {
    const terms = extractTerms(phrase);
    return terms.cities.length > 0 && !terms.rest.replace(/[|\s]/g, "");
};

function parseArea(text: string): string | null {
    for (const clause of text.toLowerCase().split(/[,;!?]+/)) {
        for (const [, phrase] of normalizeText(clause).matchAll(AREA_LEAD)) {
            const words: string[] = [];
            for (const word of phrase.split(" ")) {
                if (AREA_STOP.has(word) || UNDERSTOOD_WORDS.has(word)) break;
                if (/^\d/.test(word) && !NUMBERED_PLACES.has(words.at(-1) ?? "")) break;
                words.push(word);
            }
            const cityAt = words.findIndex((word, index) => isCityName(word) || isCityName(words.slice(index, index + 2).join(" ")));
            const area = (cityAt === -1 ? words : words.slice(0, cityAt)).join(" ");
            if (area) return titleCase(area);
        }
    }
    return null;
}

const SEARCH_HINTS = /\b(studio|studios|shoot|shooting|photoshoot|space|set|venue|location|book|booking|rent|need|looking for|chahiye)\b/;

type Amount = { value: number; hasMarker: boolean };

const amountOf = (digits: string, suffix: string | undefined, prefix: string): Amount => ({
    value: Math.round(Number(digits) * (suffix ? SUFFIX_MULTIPLIER[suffix] : 1)),
    hasMarker: Boolean(suffix) || /₹|rs|inr/.test(prefix),
});

function parseBudget(text: string): Pick<ParsedQuery, "budgetMin" | "budgetMax" | "budgetBasis"> | null {
    const range = new RegExp(`(₹|rs\\.?|inr)?\\s?(\\d+(?:\\.\\d+)?)\\s?${SUFFIX}\\s?(?:-|to)\\s?${AMOUNT}`, "g");
    for (const match of text.matchAll(range)) {
        const before = text.slice(0, match.index);
        const left = amountOf(match[2], match[3], match[1] ?? "");
        const right = amountOf(match[4], match[5], match[0].slice(match[0].search(/(?:-|to)/)));
        if (!left.hasMarker && !right.hasMarker && !/budget\s?$/.test(before)) continue;
        const leftValue = !match[3] && match[5] && Number(match[2]) < 1000 ? amountOf(match[2], match[5], "").value : left.value;
        const after = text.slice((match.index ?? 0) + match[0].length);
        return {
            budgetMin: Math.min(leftValue, right.value),
            budgetMax: Math.max(leftValue, right.value),
            budgetBasis: HOURLY_SUFFIX.test(after) ? "hourly" : "total",
        };
    }

    for (const match of text.matchAll(new RegExp(AMOUNT, "g"))) {
        const before = text.slice(0, match.index);
        const after = text.slice((match.index ?? 0) + match[0].length);
        const amount = amountOf(match[1], match[2], match[0]);
        const upper = UPPER_BOUND.test(before);
        const lower = LOWER_BOUND.test(before);
        const hourly = HOURLY_SUFFIX.test(after);
        if (!amount.hasMarker && !upper && !lower && !hourly) continue;
        if (amount.value < 100) continue;
        return {
            budgetMin: lower ? amount.value : null,
            budgetMax: lower ? null : amount.value,
            budgetBasis: hourly ? "hourly" : "total",
        };
    }
    return null;
}

function parseCrew(text: string) {
    const after = text.match(/\b(\d{1,3})\s?(?:\+\s?)?(?:people|persons|person|ppl|pax|crew|members|member|log|guests|models|heads|folks|of us)\b/);
    if (after) return Number(after[1]);
    const before = text.match(/\b(?:crew|team|group|pax|people)\s?(?:of|:|-)?\s?(\d{1,3})\b(?!\s?(?:am|pm|k|hours?|hrs?)\b)/);
    return before ? Number(before[1]) : null;
}

const toTime = (hours: number, minutes: number) => `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;

function to24(hour: number, period: string | undefined, fallbackPeriod?: string) {
    const resolved = period ?? fallbackPeriod;
    if (!resolved) return { hour: hour >= 1 && hour <= 6 ? hour + 12 : hour % 24, guessed: true };
    if (resolved === "pm" && hour < 12) return { hour: hour + 12, guessed: false };
    if (resolved === "am" && hour === 12) return { hour: 0, guessed: false };
    return { hour, guessed: false };
}

function parseTimes(text: string) {
    const clock = "(\\d{1,2})(?:[:.](\\d{2}))?\\s?(am|pm)?";
    const range = text.match(new RegExp(`\\b(?:from\\s)?${clock}\\s?(?:-|to|till|until)\\s?${clock}\\b`));
    if (range && (range[3] || range[6])) {
        const end = to24(Number(range[4]), range[6], range[3]);
        const startCandidate = to24(Number(range[1]), range[3], range[6]);
        const startHour = !range[3] && startCandidate.hour > end.hour ? Number(range[1]) : startCandidate.hour;
        const startMinutes = startHour * 60 + Number(range[2] ?? 0);
        const endMinutes = end.hour * 60 + Number(range[5] ?? 0);
        if (endMinutes > startMinutes) {
            return { startTime: toTime(startHour, Number(range[2] ?? 0)), hours: (endMinutes - startMinutes) / 60, guessed: false };
        }
    }
    const single = text.match(new RegExp(`\\b(?:at|from|by|starting)\\s${clock}\\b|\\b(\\d{1,2})(?:[:.](\\d{2}))?\\s?(am|pm)\\b`));
    if (!single) return null;
    const [hourText, minuteText, period] = single[1] ? [single[1], single[2], single[3]] : [single[4], single[5], single[6]];
    const { hour, guessed } = to24(Number(hourText), period);
    if (hour > 23) return null;
    return { startTime: toTime(hour, Number(minuteText ?? 0)), hours: null, guessed };
}

function parseHours(text: string) {
    const explicit = text.match(/\b(\d{1,2}(?:\.\d)?)\s?(?:hours|hour|hrs|hr|h|ghante|ghanta)\b/);
    if (explicit) return Number(explicit[1]);
    if (/\b(half day|half-day|aadha din)\b/.test(text)) return 4;
    if (/\b(full day|full-day|whole day|poora din|pura din)\b/.test(text)) return 8;
    return null;
}

const withoutArea = (text: string, area: string | null) =>
    area ? normalizeText(text).replace(` ${area.toLowerCase()} `, " ") : text;

export function unparsedWords(text: string): string[] {
    return tokenize(withDigits(extractTerms(withoutArea(text, parseArea(text))).rest)).filter((word) => !UNDERSTOOD_WORDS.has(word));
}

export function parseQueryRules(text: string, today: string): ParsedQuery {
    const area = parseArea(text);
    const terms = extractTerms(withoutArea(text, area));
    const rest = withDigits(terms.rest);
    const inferred: QueryField[] = [];

    const city = terms.cities[0] ?? null;

    const dates = parseDates(rest, today);
    if (dates.inferred) inferred.push("dates");

    const times = parseTimes(rest);
    if (times?.guessed) inferred.push("startTime");

    const budget = parseBudget(rest);
    const crew = parseCrew(rest);
    const hours = parseHours(rest) ?? times?.hours ?? null;

    const signals = [city, area, crew, hours, budget, times, ...dates.dates, ...terms.shootTypes, ...terms.needs, ...terms.vibes, ...terms.venueTypes]
        .filter((value) => value !== null && value !== undefined).length;
    const intent = signals === 0 && (NON_SEARCH.test(rest) || !SEARCH_HINTS.test(rest)) ? "other" : "search";

    return sanitizeQuery({
        ...EMPTY_QUERY,
        intent,
        city,
        area,
        dates: dates.dates,
        datesFlexible: dates.flexible,
        startTime: times?.startTime ?? null,
        hours,
        crew,
        ...(budget ?? {}),
        shootTypes: terms.shootTypes,
        needs: terms.needs,
        vibes: terms.vibes,
        venueTypes: terms.venueTypes,
        inferred,
    });
}
