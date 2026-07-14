import { NextRequest } from "next/server";

import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";
import { hasValidCronSecret } from "@/lib/cron/auth";
import { sendExtensionNudges } from "@/lib/maintenance/postBooking";
import { assertNoFailedMaintenanceResults } from "@/lib/maintenance/results";
import { getAutomatedNotificationStart } from "@/lib/notification-activation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    if (!hasValidCronSecret(req)) {
      return createErrorResponse("Unauthorized", 401);
    }

    const automationStart = getAutomatedNotificationStart();
    if (!automationStart) {
      return createSuccessResponse({ total: 0, results: [], skipped: "Automation activation time is not configured" });
    }
    const results = await sendExtensionNudges(200, automationStart);
    assertNoFailedMaintenanceResults(results);
    return createSuccessResponse({ total: results.length, results });
  } catch (error) {
    return handleRouteError(error, "GET /api/cron/extension-nudge");
  }
}
