import "server-only";

import { unstable_cache } from "next/cache";

import { AiUnavailableError, geminiConfigured, generateGeminiJson, toGeminiSchema } from "@/lib/search/ai/gemini";
import { SEARCH_CONFIG } from "@/lib/search/config";
import { formatDateKey } from "@/lib/search/explain";
import { parseQueryRules, unparsedWords } from "@/lib/search/parse/rules";
import { redactPersonalData } from "@/lib/search/redact";
import { normalizeText } from "@/lib/search/vocabulary";
import { OVERRIDE_FIELD_MAP, type ParsedQuery, parsedQuerySchema, QUERY_FIELDS, type QueryField, sanitizeQuery, TAG_FIELDS } from "@/schemas/search";


const PARSE_SCHEMA = toGeminiSchema(parsedQuerySchema);

const PARSE_INSTRUCTIONS = [
    "You turn a customer's free-text studio search from India into JSON that matches the schema exactly.",
    "Searches may be English, Hindi written in Latin script (Hinglish), or shorthand. Output only values the search supports.",
    "intent: 'search' when the text describes a shoot or space need; 'other' for greetings, support questions, refunds or anything else.",
    "city: the Indian city name (e.g. Lucknow, Delhi, Gurugram, Noida, Delhi NCR). area: the neighbourhood as written, e.g. 'Gomti Nagar'.",
    "dates: ISO dates (YYYY-MM-DD) resolved against the 'Today' line in IST. 'kal' means tomorrow and 'parso' the day after. 'Next <weekday>' means the coming one; add 'dates' to inferred when ambiguous.",
    "startTime: 24h HH:mm. hours: booking length in hours. crew: number of people on set.",
    "budgetMin/budgetMax: rupees; k = 1000, lakh = 100000. budgetBasis 'hourly' only when the amount is per hour, otherwise 'total'.",
    "shootTypes, needs, vibes, venueTypes: choose only from the enums; map synonyms (cyc or infinity wall = Cyclorama, white cyc = Infinity White Cyc, makeup room = Makeup Vanity, AC = Air Conditioned).",
    "inferred: list every field you filled by guessing rather than from explicit words. Leave unknown scalars null and unknown lists empty.",
    `Allowed inferred values: ${QUERY_FIELDS.join(", ")}.`,
].join("\n");

const parseInput = (text: string, today: string) => `Today: ${formatDateKey(today)} (${today}), IST.\nSearch: ${text}`;

export async function parseQueryWithAi(text: string, today: string): Promise<ParsedQuery> {
    const raw = await generateGeminiJson("parse", {
        system: PARSE_INSTRUCTIONS,
        input: parseInput(text, today),
        schema: PARSE_SCHEMA,
        timeoutMs: SEARCH_CONFIG.timeoutsMs.parse,
    });
    return sanitizeQuery(raw);
}

const cachedAiParse = unstable_cache(parseQueryWithAi, [SEARCH_CONFIG.cacheVersion, "query-parse"], { revalidate: SEARCH_CONFIG.cacheSeconds });

const isEmpty = (value: unknown) => value === null || (Array.isArray(value) && value.length === 0);

const queryFieldOf = (key: string): QueryField | null =>
    key in OVERRIDE_FIELD_MAP ? OVERRIDE_FIELD_MAP[key as keyof typeof OVERRIDE_FIELD_MAP] : null;

export function mergeQueries(primary: ParsedQuery, fallback: ParsedQuery): ParsedQuery {
    const merged: Record<string, unknown> = { ...primary };
    const inferred = new Set(primary.inferred);
    for (const key of Object.keys(parsedQuerySchema.shape) as (keyof ParsedQuery)[]) {
        if (key === "inferred" || !isEmpty(primary[key]) || isEmpty(fallback[key])) continue;
        merged[key] = fallback[key];
        const field = queryFieldOf(key);
        if (field && fallback.inferred.includes(field)) inferred.add(field);
    }
    return sanitizeQuery({ ...merged, inferred: Array.from(inferred) });
}

export type ParseResult = { parsed: ParsedQuery; source: "ai" | "rules" };

type ParseContext = { today: string; allowAi: boolean };

export const prepareQueryText = (query: string) => normalizeText(redactPersonalData(query)).trim();

async function withAiFallback(rules: ParsedQuery, context: ParseContext, run: () => Promise<ParsedQuery>): Promise<ParseResult> {
    if (!context.allowAi || !geminiConfigured()) return { parsed: rules, source: "rules" };
    try {
        return { parsed: mergeQueries(await run(), rules), source: "ai" };
    } catch (error) {
        if (!(error instanceof AiUnavailableError)) console.error("[ai-search] AI parse failed; using rules.", error);
        return { parsed: rules, source: "rules" };
    }
}

export async function parseQuery(text: string, context: ParseContext): Promise<ParseResult> {
    const rules = parseQueryRules(text, context.today);
    if (!text || unparsedWords(text).length === 0) return { parsed: rules, source: "rules" };
    return withAiFallback(rules, context, () => cachedAiParse(text, context.today));
}

const REFINE_INSTRUCTIONS = `${PARSE_INSTRUCTIONS}\nYou also receive the customer's current search as JSON. Apply the follow-up to it and return the complete updated search, keeping every field the follow-up does not change.`;

const SCALAR_REFINEMENTS = ["city", "area", "dates", "startTime", "hours", "crew", "budgetMin", "budgetMax"] as const;
const CHEAPER = /\b(cheaper|less expensive|lower budget|lower price|budget kam|kam budget|sasta|saste)\b/;
const CHEAPER_FACTOR = 0.8;

export function refineWithRules(current: ParsedQuery, text: string, today: string): ParsedQuery {
    const delta = parseQueryRules(text, today);
    const next: Record<string, unknown> = { ...current, intent: "search" };
    const touched = new Set<string>();

    for (const key of SCALAR_REFINEMENTS) {
        if (isEmpty(delta[key])) continue;
        next[key] = delta[key];
        touched.add(queryFieldOf(key) ?? key);
    }
    if (delta.budgetMin !== null || delta.budgetMax !== null) next.budgetBasis = delta.budgetBasis;
    if (CHEAPER.test(text) && delta.budgetMax === null && current.budgetMax !== null) {
        next.budgetMax = Math.round(current.budgetMax * CHEAPER_FACTOR);
        touched.add("budget");
    }
    for (const key of TAG_FIELDS) next[key] = Array.from(new Set([...current[key], ...delta[key]]));

    return sanitizeQuery({ ...next, inferred: current.inferred.filter((field) => !touched.has(field)) });
}

export async function refineQuery(current: ParsedQuery, followUp: string, context: ParseContext): Promise<ParsedQuery> {
    const text = prepareQueryText(followUp);
    const rules = refineWithRules(current, text, context.today);
    const refined = await withAiFallback(rules, context, async () => sanitizeQuery(await generateGeminiJson("parse", {
        system: REFINE_INSTRUCTIONS,
        input: `${parseInput(text, context.today)}\nCurrent search: ${JSON.stringify(current)}`,
        schema: PARSE_SCHEMA,
        timeoutMs: SEARCH_CONFIG.timeoutsMs.parse,
    })));
    return refined.parsed;
}
