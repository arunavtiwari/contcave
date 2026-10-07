import { after } from "next/server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { createErrorResponse, handleRouteError } from "@/lib/api-utils";
import { getIpLocation, isBotRequest } from "@/lib/http/requestMeta";
import { aiAllowedFor, searchRateLimitResponse } from "@/lib/search/access";
import { SEARCH_CONFIG } from "@/lib/search/config";
import { writeAiReasons } from "@/lib/search/reasons";
import { resolveQuery, runAiSearch, type SearchContext } from "@/lib/search/service";
import { newSearchSessionToken, recordSearchSession } from "@/lib/search/session";
import type { SearchStreamEvent } from "@/lib/search/types";
import { parseSearchParams } from "@/schemas/search";

const encoder = new TextEncoder();
const encodeEvent = (event: SearchStreamEvent) => encoder.encode(`${JSON.stringify(event)}\n`);

export async function GET(request: Request) {
    try {
        const limited = searchRateLimitResponse(request.headers, "ai-search-query", SEARCH_CONFIG.searchPerMinute);
        if (limited) return limited;

        const searchRequest = parseSearchParams(Object.fromEntries(new URL(request.url).searchParams));
        const context: SearchContext = {
            now: new Date(),
            allowAi: aiAllowedFor(request.headers),
            visitor: isBotRequest(request.headers) ? null : getIpLocation(request.headers),
        };
        const resolved = await resolveQuery(searchRequest, context);
        if (!resolved) return createErrorResponse("Describe your shoot to search.", 400);

        const [outcome, currentUser] = await Promise.all([runAiSearch(resolved, searchRequest, context), getCurrentUser()]);
        const sessionToken = newSearchSessionToken();
        after(async () => {
            try {
                await recordSearchSession(sessionToken, outcome.session, currentUser?.id ?? null);
            } catch (error) {
                console.error("[ai-search] Failed to record the search session.", error);
            }
        });

        const stream = new ReadableStream<Uint8Array>({
            async start(controller) {
                controller.enqueue(encodeEvent({ type: "view", view: outcome.view, sessionToken }));
                const reasons = outcome.explainable.length
                    ? await writeAiReasons(outcome.view.parsed, outcome.explainable, context.allowAi)
                    : {};
                try {
                    if (Object.keys(reasons).length) controller.enqueue(encodeEvent({ type: "reasons", reasons }));
                    controller.close();
                } catch {
                    return;
                }
            },
        });

        return new Response(stream, {
            headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
        });
    } catch (error) {
        return handleRouteError(error, "GET /api/search");
    }
}
