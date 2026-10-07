import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";
import { searchRateLimitResponse } from "@/lib/search/access";
import { SEARCH_CONFIG } from "@/lib/search/config";
import { suggestStudios } from "@/lib/search/suggest";
import { suggestQuerySchema } from "@/schemas/search";

export async function GET(request: Request) {
    try {
        const limited = searchRateLimitResponse(request.headers, "ai-search-suggest", SEARCH_CONFIG.suggest.perMinute);
        if (limited) return limited;

        const parsed = suggestQuerySchema.safeParse({ q: new URL(request.url).searchParams.get("q") ?? "" });
        if (!parsed.success) return createErrorResponse(parsed.error.issues[0].message, 400);

        return createSuccessResponse(await suggestStudios(parsed.data.q, new Date()));
    } catch (error) {
        return handleRouteError(error, "GET /api/search/suggest");
    }
}
