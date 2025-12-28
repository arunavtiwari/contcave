import { NextRequest } from "next/server";
import { runDueSplits } from "@/lib/cron/runDueSplits";
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        const isGitHubAction = req.headers.get("x-github-secret") === process.env.CRON_SECRET;

        if (!isGitHubAction) {
            return createErrorResponse("Unauthorized", 401);
        }

        const limit = Number(req.nextUrl.searchParams.get("limit") || 200);
        const results = await runDueSplits(limit);
        const ok = results.filter((r) => r.ok).length;

        return createSuccessResponse({ ok, total: results.length, results });
    } catch (error) {
        return handleRouteError(error, "GET /api/cron/easy-split");
    }
}
