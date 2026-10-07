"use server";

import { headers } from "next/headers";

import { createAction } from "@/lib/actions-utils";
import { istDateKey } from "@/lib/booking/dayAvailability";
import { UserFacingError } from "@/lib/errors";
import { aiAllowedFor } from "@/lib/search/access";
import { SEARCH_CONFIG } from "@/lib/search/config";
import { refineQuery } from "@/lib/search/parse";
import { recordSearchEvent } from "@/lib/search/session";
import { rateLimitRequest } from "@/lib/security/rateLimit";
import { diffOverrides, overridesToParams, refineSearchSchema, sanitizeQuery, searchEventSchema } from "@/schemas/search";

const EVENTS_PER_MINUTE = 60;
const REFINES_PER_MINUTE = 20;

export const refineSearchAction = createAction(refineSearchSchema, {}, async ({ parsed, text }) => {
    const headerList = await headers();
    if (!rateLimitRequest(headerList, { scope: "ai-search-refine", limit: REFINES_PER_MINUTE, windowMs: SEARCH_CONFIG.rateWindowMs }).allowed) {
        throw new UserFacingError("Too many refinements. Please wait a moment.", 429);
    }
    const current = sanitizeQuery(parsed);
    const next = await refineQuery(current, text, { today: istDateKey(new Date()), allowAi: aiAllowedFor(headerList) });
    return overridesToParams(diffOverrides(current, next));
});

export const logSearchEventAction = createAction(searchEventSchema, {}, async (event) => {
    if (!rateLimitRequest(await headers(), { scope: "search-event", limit: EVENTS_PER_MINUTE, windowMs: SEARCH_CONFIG.rateWindowMs }).allowed) return false;
    return recordSearchEvent(event);
});
