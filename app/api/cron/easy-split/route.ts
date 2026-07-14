import { NextRequest } from "next/server";

import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";
import { hasValidCronSecret } from "@/lib/cron/auth";
import { runDueSplits } from "@/lib/maintenance/payoutSplits";
import { assertNoFailedMaintenanceResults } from "@/lib/maintenance/results";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        if (!hasValidCronSecret(req)) {
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
        assertNoFailedMaintenanceResults(results);
        const ok = results.filter((r) => r.ok).length;

        return createSuccessResponse({ ok, total: results.length, results });
    } catch (error) {
        return handleRouteError(error, "GET /api/cron/easy-split");
    }
}
