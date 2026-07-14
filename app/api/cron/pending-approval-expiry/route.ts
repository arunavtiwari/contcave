import { NextRequest } from "next/server";

import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";
import { hasValidCronSecret } from "@/lib/cron/auth";
import { assertNoFailedMaintenanceResults } from "@/lib/maintenance/results";
import { getAutomatedNotificationStart } from "@/lib/notification-activation";
import { ReservationService } from "@/lib/reservation/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    if (!hasValidCronSecret(req)) {
      return createErrorResponse("Unauthorized", 401);
    }

    const automationStart = getAutomatedNotificationStart();
    if (!automationStart) {
      return createSuccessResponse({ success: true, results: [], skipped: "Automation activation time is not configured" });
    }
    const results = await ReservationService.expirePendingApprovalReservations(new Date(), undefined, automationStart);
    assertNoFailedMaintenanceResults(results);
    return createSuccessResponse({ success: true, results });
  } catch (error) {
    return handleRouteError(error, "GET /api/cron/pending-approval-expiry");
  }
}
