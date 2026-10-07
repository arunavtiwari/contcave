import "server-only";

import { createErrorResponse } from "@/lib/api-utils";
import { isBotRequest } from "@/lib/http/requestMeta";
import { SEARCH_CONFIG } from "@/lib/search/config";
import { formatRetryAfterMs, rateLimitRequest } from "@/lib/security/rateLimit";

export function aiAllowedFor(headers: Headers) {
    if (isBotRequest(headers)) return false;
    return rateLimitRequest(headers, { scope: "ai-search", limit: SEARCH_CONFIG.ai.perClientPerMinute, windowMs: SEARCH_CONFIG.rateWindowMs }).allowed;
}

export function searchRateLimitResponse(headers: Headers, scope: string, limit: number) {
    const result = rateLimitRequest(headers, { scope, limit, windowMs: SEARCH_CONFIG.rateWindowMs });
    if (result.allowed) return null;
    const response = createErrorResponse("Too many searches. Please slow down.", 429);
    response.headers.set("Retry-After", formatRetryAfterMs(result.resetAt));
    return response;
}
