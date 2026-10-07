import { z } from "zod";

import { isDateKey } from "@/lib/booking/dayAvailability";
import { type LatLng, parseLatLngParam, parsePlaceLabelParam } from "@/lib/geo";
import { SEARCH_CONFIG } from "@/lib/search/config";
import { containsPersonalData } from "@/lib/search/redact";
import {
    AESTHETIC_LABELS,
    FACILITY_AMENITIES,
    SET_FEATURE_LABELS,
    USE_CASE_LABELS,
    VENUE_TYPE_LABELS,
} from "@/lib/taxonomy";

const FACILITY_LABELS = FACILITY_AMENITIES.map((item) => item.label) as [string, ...string[]];
export const NEED_LABELS = [...SET_FEATURE_LABELS, ...FACILITY_LABELS] as [string, ...string[]];

export const QUERY_FIELDS = [
    "city",
    "area",
    "dates",
    "startTime",
    "hours",
    "crew",
    "budget",
    "shootTypes",
    "needs",
    "vibes",
    "venueTypes",
] as const;

export type QueryField = (typeof QUERY_FIELDS)[number];

const BUDGET_BASES = ["total", "hourly"] as const;

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const LIST_LIMITS = {
    dates: SEARCH_CONFIG.maxDates,
    shootTypes: 3,
    needs: 10,
    vibes: 5,
    venueTypes: 4,
    inferred: QUERY_FIELDS.length,
} as const;

type ListField = keyof typeof LIST_LIMITS;

export const parsedQuerySchema = z.object({
    intent: z.enum(["search", "other"]),
    city: z.string().trim().min(1).max(60).nullable(),
    area: z.string().trim().min(1).max(80).nullable(),
    dates: z.array(z.string().regex(DATE_KEY_PATTERN).refine(isDateKey)).max(LIST_LIMITS.dates),
    datesFlexible: z.boolean(),
    startTime: z.string().regex(TIME_PATTERN).nullable(),
    hours: z.number().min(0.5).max(24).nullable(),
    crew: z.number().int().min(1).max(500).nullable(),
    budgetMin: z.number().int().min(0).max(10_000_000).nullable(),
    budgetMax: z.number().int().min(0).max(10_000_000).nullable(),
    budgetBasis: z.enum(BUDGET_BASES),
    shootTypes: z.array(z.enum(USE_CASE_LABELS)).max(LIST_LIMITS.shootTypes),
    needs: z.array(z.enum(NEED_LABELS)).max(LIST_LIMITS.needs),
    vibes: z.array(z.enum(AESTHETIC_LABELS)).max(LIST_LIMITS.vibes),
    venueTypes: z.array(z.enum(VENUE_TYPE_LABELS)).max(LIST_LIMITS.venueTypes),
    inferred: z.array(z.enum(QUERY_FIELDS)).max(LIST_LIMITS.inferred),
});

export type ParsedQuery = z.infer<typeof parsedQuerySchema>;

export const EMPTY_QUERY: ParsedQuery = {
    intent: "search",
    city: null,
    area: null,
    dates: [],
    datesFlexible: false,
    startTime: null,
    hours: null,
    crew: null,
    budgetMin: null,
    budgetMax: null,
    budgetBasis: "total",
    shootTypes: [],
    needs: [],
    vibes: [],
    venueTypes: [],
    inferred: [],
};

const unique = <T>(values: T[]) => Array.from(new Set(values));

const isListField = (key: string): key is ListField => key in LIST_LIMITS;

function sanitizeField(key: string, value: unknown): { valid: boolean; value: unknown } {
    const field = parsedQuerySchema.shape[key as keyof typeof parsedQuerySchema.shape];
    if (field instanceof z.ZodArray && isListField(key)) {
        const items = Array.isArray(value) ? value : [];
        const valid = unique(items.filter((item) => field.element.safeParse(item).success)).slice(0, LIST_LIMITS[key]);
        return { valid: true, value: valid };
    }
    const parsed = field.safeParse(value);
    if (!parsed.success || (typeof parsed.data === "string" && containsPersonalData(parsed.data))) return { valid: false, value: undefined };
    return { valid: true, value: parsed.data };
}

export function sanitizeQuery(raw: unknown): ParsedQuery {
    const input = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const parsed: Record<string, unknown> = { ...EMPTY_QUERY };

    for (const key of Object.keys(parsedQuerySchema.shape)) {
        const field = sanitizeField(key, input[key]);
        if (field.valid) parsed[key] = field.value;
    }

    const result = parsedQuerySchema.parse(parsed);
    if (result.budgetMin !== null && result.budgetMax !== null && result.budgetMin > result.budgetMax) {
        return { ...result, budgetMin: result.budgetMax, budgetMax: result.budgetMin };
    }
    return result;
}

const ANY_VALUE = "any";

export const SEARCH_PARAMS = {
    query: "q",
    city: "city",
    area: "place",
    areaPoint: "near",
    dates: "dates",
    startTime: "start",
    hours: "hours",
    crew: "crew",
    budget: "budget",
    budgetBasis: "basis",
    shootTypes: "types",
    needs: "needs",
    vibes: "vibes",
    venueTypes: "venues",
} as const;

export const OVERRIDE_FIELD_MAP = {
    city: "city",
    area: "area",
    dates: "dates",
    startTime: "startTime",
    hours: "hours",
    crew: "crew",
    budgetMin: "budget",
    budgetMax: "budget",
    budgetBasis: "budget",
    shootTypes: "shootTypes",
    needs: "needs",
    vibes: "vibes",
    venueTypes: "venueTypes",
} as const satisfies Record<string, QueryField>;

export type QueryOverrides = Partial<Pick<ParsedQuery, keyof typeof OVERRIDE_FIELD_MAP>>;

export type SearchRequest = {
    query: string;
    overrides: QueryOverrides;
    areaPoint: LatLng | null;
};

type RawParams = Record<string, string | string[] | undefined>;

const firstParam = (params: RawParams, key: string) => {
    const value = params[key];
    const first = Array.isArray(value) ? value[0] : value;
    return typeof first === "string" ? first.trim() : undefined;
};

export const TAG_FIELDS = ["shootTypes", "needs", "vibes", "venueTypes"] as const;

const TEXT_OVERRIDES = ["city", "area", "startTime"] as const;
const NUMBER_OVERRIDES = ["hours", "crew"] as const;
const LIST_OVERRIDES = ["dates", ...TAG_FIELDS] as const;

const listParam = (value: string) => (value === ANY_VALUE ? [] : unique(value.split(",").map((part) => part.trim()).filter(Boolean)));

function overrideFromParams(params: RawParams): QueryOverrides {
    const read = (key: keyof typeof SEARCH_PARAMS) => firstParam(params, SEARCH_PARAMS[key]);
    const draft: Record<string, unknown> = {};

    for (const key of TEXT_OVERRIDES) {
        const value = read(key);
        if (value !== undefined) draft[key] = value === ANY_VALUE ? null : parsePlaceLabelParam(value) ?? null;
    }
    for (const key of NUMBER_OVERRIDES) {
        const value = read(key);
        if (value !== undefined) draft[key] = value === ANY_VALUE ? null : Number(value);
    }
    for (const key of LIST_OVERRIDES) {
        const value = read(key);
        if (value !== undefined) draft[key] = listParam(value);
    }
    const budget = read("budget");
    if (budget !== undefined) {
        const [min, max] = budget === ANY_VALUE ? ["", ""] : budget.split("-");
        draft.budgetMin = min ? Number(min) : null;
        draft.budgetMax = max ? Number(max) : null;
    }
    const basis = read("budgetBasis");
    if (basis !== undefined) draft.budgetBasis = basis;

    const overrides: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(draft)) {
        const field = sanitizeField(key, value);
        if (field.valid) overrides[key] = field.value;
    }
    return overrides as QueryOverrides;
}

export function parseSearchParams(params: RawParams): SearchRequest {
    const query = (firstParam(params, SEARCH_PARAMS.query) ?? "").slice(0, SEARCH_CONFIG.maxQueryLength);
    return {
        query,
        overrides: overrideFromParams(params),
        areaPoint: parseLatLngParam(firstParam(params, SEARCH_PARAMS.areaPoint)),
    };
}

export function overridesToParams(overrides: QueryOverrides): Record<string, string> {
    const params: Record<string, string> = {};

    for (const key of [...TEXT_OVERRIDES, ...NUMBER_OVERRIDES]) {
        if (key in overrides) params[SEARCH_PARAMS[key]] = String(overrides[key] ?? ANY_VALUE);
    }
    for (const key of LIST_OVERRIDES) {
        if (key in overrides) params[SEARCH_PARAMS[key]] = overrides[key]?.length ? overrides[key].join(",") : ANY_VALUE;
    }
    if ("budgetMin" in overrides || "budgetMax" in overrides) {
        const min = overrides.budgetMin ?? null;
        const max = overrides.budgetMax ?? null;
        params[SEARCH_PARAMS.budget] = min === null && max === null ? ANY_VALUE : `${min ?? ""}-${max ?? ""}`;
    }
    if (overrides.budgetBasis) params[SEARCH_PARAMS.budgetBasis] = overrides.budgetBasis;
    return params;
}

export function diffOverrides(current: ParsedQuery, next: ParsedQuery): QueryOverrides {
    const changed: Record<string, unknown> = {};
    for (const key of Object.keys(OVERRIDE_FIELD_MAP) as (keyof QueryOverrides)[]) {
        if (JSON.stringify(current[key]) !== JSON.stringify(next[key])) changed[key] = next[key];
    }
    if ("budgetMin" in changed || "budgetMax" in changed) {
        changed.budgetMin = next.budgetMin;
        changed.budgetMax = next.budgetMax;
    }
    return changed as QueryOverrides;
}

export const suggestQuerySchema = z.object({
    q: z.string().trim().min(SEARCH_CONFIG.suggest.minChars).max(SEARCH_CONFIG.maxQueryLength),
});

export const searchEventSchema = z.object({
    sessionToken: z.string().regex(/^[a-f\d]{24}\.[\w-]{43}$/),
    type: z.enum(["click", "handoff", "enquire"]),
    listingId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
});

export type SearchEvent = z.infer<typeof searchEventSchema>;

export const refineSearchSchema = z.object({
    parsed: z.unknown(),
    text: z.string().trim().min(1).max(SEARCH_CONFIG.maxQueryLength),
});
