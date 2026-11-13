/**
 * Guardrails that run in code, outside the model. The prompt asks for these
 * behaviours; this file is what makes them true when the model slips.
 *
 *  - Input: length cap and control-character strip on what the customer sends.
 *  - Contact masking: phone numbers, emails and handles never reach the model
 *    from listing text, and never reach the customer from the model.
 *  - Grounding: a rupee amount in a reply must be a number a tool returned or
 *    the customer said. Sentences with any other amount are removed.
 *  - No false confirmations: the assistant cannot say a booking, payment or
 *    refund went through, because no tool lets it do those things.
 *
 * Pure functions, no server-only imports, so they can be unit-tested and run
 * against evals/concierge directly.
 */

import { MAX_USER_MESSAGE_LENGTH } from "./types";

// ─── Input ────────────────────────────────────────────────────────────────────

export function cleanUserMessage(raw: unknown): string | null {
    if (typeof raw !== "string") return null;
    const text = raw
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
        .replace(/\s+\n/g, "\n")
        .trim()
        .slice(0, MAX_USER_MESSAGE_LENGTH);
    return text.length > 0 ? text : null;
}

// ─── Contact masking ──────────────────────────────────────────────────────────

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
/** Indian mobiles with or without +91 / 0, allowing spaces and dashes between groups. */
const PHONE = /(?<![\d₹.,])(?:\+?91[\s-]?|0)?[6-9]\d(?:[\s-]?\d){8}(?![\d])/g;
const CHAT_LINK = /\b(?:https?:\/\/)?(?:wa\.me|api\.whatsapp\.com|t\.me|instagram\.com|instagr\.am)\/[^\s)]+/gi;
/** @handles, but not email remnants or "@ 5pm". */
const HANDLE = /(?<![A-Za-z0-9._%+-])@[A-Za-z0-9._]{3,30}\b/g;

export const HIDDEN = "[shared after booking]";

/** Remove ways to reach a studio off-platform. Idempotent. */
export function maskContactDetails(text: string, options: { allowLinkHosts?: string[] } = {}): string {
    const allowed = options.allowLinkHosts ?? [];
    return text
        .replace(EMAIL, HIDDEN)
        .replace(CHAT_LINK, (match) => (allowed.some((host) => match.includes(host)) ? match : HIDDEN))
        .replace(PHONE, HIDDEN)
        .replace(HANDLE, HIDDEN);
}

// ─── Grounding ────────────────────────────────────────────────────────────────

const RUPEE_AMOUNT = /(?:₹|Rs\.?|INR)\s?([\d,]+(?:\.\d+)?)(\s?(?:k|K|lakh|lakhs|L)\b)?/g;

const toNumber = (digits: string, suffix?: string) => {
    const base = Number(digits.replace(/,/g, ""));
    if (!Number.isFinite(base)) return null;
    const unit = suffix?.trim().toLowerCase();
    if (unit === "k") return base * 1_000;
    if (unit === "lakh" || unit === "lakhs" || unit === "l") return base * 100_000;
    return base;
};

/** Every number of two or more digits in a value, however deeply nested. */
export function collectNumbers(value: unknown, into: Set<number> = new Set()): Set<number> {
    if (typeof value === "number" && Number.isFinite(value)) {
        into.add(Math.round(value));
        into.add(value);
    } else if (typeof value === "string") {
        for (const match of value.matchAll(/\d[\d,]*(?:\.\d+)?/g)) {
            const parsed = Number(match[0].replace(/,/g, ""));
            if (Number.isFinite(parsed)) {
                into.add(parsed);
                into.add(Math.round(parsed));
            }
        }
        for (const match of value.matchAll(RUPEE_AMOUNT)) {
            const parsed = toNumber(match[1], match[2]);
            if (parsed !== null) into.add(parsed);
        }
        // "50k", "2 lakh": customers rarely type the rupee sign, and the reply may write it back as ₹50k or ₹50,000.
        for (const match of value.matchAll(/(\d[\d,]*(?:\.\d+)?)\s?(k|lakhs?|l)\b/gi)) {
            const parsed = toNumber(match[1], match[2]);
            if (parsed !== null) into.add(parsed);
        }
    } else if (Array.isArray(value)) {
        for (const item of value) collectNumbers(item, into);
    } else if (value && typeof value === "object") {
        for (const item of Object.values(value)) collectNumbers(item, into);
    }
    return into;
}

export function ungroundedAmounts(text: string, known: Set<number>): number[] {
    const found: number[] = [];
    for (const match of text.matchAll(RUPEE_AMOUNT)) {
        const amount = toNumber(match[1], match[2]);
        if (amount === null) continue;
        // Paise rounding: a tool's 2,360.00 and the reply's 2,360 are the same amount.
        if (known.has(amount) || known.has(Math.round(amount))) continue;
        found.push(amount);
    }
    return found;
}

// ─── Dates ────────────────────────────────────────────────────────────────────

const MONTH_NAMES = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const MONTH = "(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*";
const DATE_MENTION = new RegExp(String.raw`\b(\d{1,2})(?:st|nd|rd|th)?\s+${MONTH}\b|\b${MONTH}\s+(\d{1,2})(?:st|nd|rd|th)?\b`, "gi");

const monthDay = (month: string, day: string) => {
    const index = MONTH_NAMES.indexOf(month.slice(0, 3).toLowerCase());
    const number = Number(day);
    return index >= 0 && number >= 1 && number <= 31 ? `${String(index + 1).padStart(2, "0")}-${String(number).padStart(2, "0")}` : null;
};

const mentionedDates = (text: string) =>
    Array.from(text.matchAll(DATE_MENTION), (match) => ({ text: match[0], key: match[1] ? monthDay(match[2], match[1]) : monthDay(match[3], match[4]) })).filter(
        (entry): entry is { text: string; key: string } => entry.key !== null
    );

/**
 * Every calendar date (as "MM-DD") that appears in a value: ISO dates from the
 * context and tool results, and dates the customer wrote out in words.
 */
export function collectDates(value: unknown, into: Set<string> = new Set()): Set<string> {
    if (typeof value === "string") {
        for (const match of value.matchAll(/\b\d{4}-(\d{2}-\d{2})\b/g)) into.add(match[1]);
        for (const entry of mentionedDates(value)) into.add(entry.key);
    } else if (Array.isArray(value)) {
        for (const item of value) collectDates(item, into);
    } else if (value && typeof value === "object") {
        for (const item of Object.values(value)) collectDates(item, into);
    }
    return into;
}

/** Dates written in a reply ("14 Dec") that nothing in the conversation supplied. */
export function ungroundedDates(text: string, known: Set<string>): string[] {
    return mentionedDates(text).filter((entry) => !known.has(entry.key)).map((entry) => entry.text);
}

// ─── False confirmations ──────────────────────────────────────────────────────

const FALSE_CONFIRMATION = [
    /\b(?:booking|slot|studio|reservation)\s+(?:is|has been|is now|'s)\s+(?:confirmed|booked|reserved|secured)\b/i,
    /\bI(?:'ve| have)\s+(?:booked|reserved|confirmed|held|blocked)\b/i,
    /\b(?:booking|reservation|slot)\s+(?:confirmed|booked|reserved|secured)\b/i,
    /\byou(?:'re| are)\s+(?:all\s+)?(?:booked|confirmed)\b/i,
    /\bpayment\s+(?:is|was|has been)\s+(?:received|successful|confirmed|processed)\b/i,
    /\brefund\s+(?:is|was|has been|will be)\s+(?:approved|processed|issued|initiated)\b/i,
    /\b(?:I(?:'ve| have)|we(?:'ve| have))\s+(?:applied|given|added)\s+(?:a|the|your)\s+discount\b/i,
];

/** "Once the booking is confirmed, the address is sent" describes the process; it claims nothing. */
const CONDITIONAL = /\b(once|after|when|until|unless|as soon as|if|before|whether|nothing is|not yet|isn't|is not|won't|will not)\b/i;

// ─── Reply check ──────────────────────────────────────────────────────────────

const splitSentences = (text: string) => text.match(/[^.!?\n]+[.!?]*\s*|\n+/g) ?? [text];

export type ReplyCheck = {
    text: string;
    changed: boolean;
    reasons: string[];
};

/**
 * Check a finished reply and return the version that may be shown. Sentences
 * that state an unknown amount or a false confirmation are dropped; if
 * nothing is left, a safe line is returned instead.
 */
export function checkReply(
    reply: string,
    known: Set<number>,
    options: { allowLinkHosts?: string[]; knownDates?: Set<string>; pricesOnScreen?: boolean } = {}
): ReplyCheck {
    const reasons: string[] = [];
    const masked = maskContactDetails(reply, options);
    if (masked !== reply) reasons.push("contact_details");

    const kept: string[] = [];
    for (let sentence of splitSentences(masked)) {
        // A small model will sometimes "work out" a date and get it wrong. An aside in brackets is
        // cut on its own; anywhere else the sentence goes.
        if (options.knownDates && ungroundedDates(sentence, options.knownDates).length > 0) {
            reasons.push("ungrounded_date");
            sentence = sentence.replace(/\s*\([^()]*\)/g, (aside) => (ungroundedDates(aside, options.knownDates!).length > 0 ? "" : aside));
            if (ungroundedDates(sentence, options.knownDates).length > 0) continue;
        }
        if (ungroundedAmounts(sentence, known).length > 0) {
            reasons.push("ungrounded_amount");
            continue;
        }
        if (FALSE_CONFIRMATION.some((pattern) => pattern.test(sentence)) && !CONDITIONAL.test(sentence)) {
            reasons.push("false_confirmation");
            continue;
        }
        kept.push(sentence);
    }

    let text = kept.join("").replace(/\n{3,}/g, "\n\n").trim();
    // When a card with the real prices is on screen, a removed figure needs no apology: the card has it.
    if (reasons.includes("ungrounded_amount") && !(options.pricesOnScreen && text)) {
        text = `${text}${text ? "\n\n" : ""}I'd rather not guess at prices. Tell me the studio, date and hours and I'll pull the exact figure.`;
    }
    if (reasons.includes("false_confirmation")) {
        text = `${text}${text ? "\n\n" : ""}To be clear, nothing is booked or paid for until you complete it on the studio's page.`;
    }
    if (!text) text = "Sorry, I lost my thread there. Could you tell me again what you need for the shoot?";

    return { text, changed: text !== reply.trim(), reasons: Array.from(new Set(reasons)) };
}

// ─── Streaming ────────────────────────────────────────────────────────────────

/**
 * Contact masking for text that arrives in pieces. A phone number or email can
 * be split across deltas, so the last few characters are held back until more
 * text (or the end) shows whether they are part of one.
 */
export class MaskedStream {
    private raw = "";
    private emitted = 0;
    private static readonly HOLD_BACK = 40;

    constructor(private readonly options: { allowLinkHosts?: string[] } = {}) {}

    /** Add a delta; returns the newly safe text to show, possibly empty. */
    push(delta: string): string {
        this.raw += delta;
        const safe = this.raw.slice(0, Math.max(0, this.raw.length - MaskedStream.HOLD_BACK));
        // Cut at the last whitespace so a token is never emitted half-finished.
        const cut = Math.max(safe.lastIndexOf(" "), safe.lastIndexOf("\n")) + 1;
        return this.emit(maskContactDetails(this.raw.slice(0, cut), this.options));
    }

    /** Everything that is left, at the end of the reply. */
    flush(): string {
        return this.emit(maskContactDetails(this.raw, this.options));
    }

    get text(): string {
        return maskContactDetails(this.raw, this.options);
    }

    private emit(masked: string): string {
        if (masked.length <= this.emitted) return "";
        const out = masked.slice(this.emitted);
        this.emitted = masked.length;
        return out;
    }
}
