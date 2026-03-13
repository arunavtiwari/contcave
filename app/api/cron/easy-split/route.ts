import { NextRequest } from "next/server";

import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";
import { runDueSplits } from "@/lib/cron/runDueSplits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        const cronSecret = req.headers.get("x-github-secret") || 
                          req.headers.get("x-cron-secret") || 
                          req.headers.get("authorization")?.replace("Bearer ", "");
        const expectedSecret = process.env.CRON_SECRET;

        if (!expectedSecret || cronSecret !== expectedSecret) {
            return createErrorResponse("Unauthorized", 401);
        }

        const limitParam = req.nextUrl.searchParams.get("limit");
        let limit = 200;
        if (limitParam) {
            const parsed = Number(limitParam);
            if (!Number.isFinite(parsed) || parsed < 1 || parsed > 1000) {
                return createErrorResponse("limit must be a number between 1 and 1000", 400);
            }
            limit = Math.round(parsed);
        }

        const results = await runDueSplits(limit);
        const ok = results.filter((r) => r.ok).length;

        return createSuccessResponse({ ok, total: results.length, results });
    } catch (error) {
        return handleRouteError(error, "GET /api/cron/easy-split");
    }
}
