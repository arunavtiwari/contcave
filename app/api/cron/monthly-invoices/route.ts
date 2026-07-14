import { NextRequest } from "next/server";

import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";
import { hasValidCronSecret } from "@/lib/cron/auth";
import {
  getCurrentMonthToDatePeriod,
  getPreviousMonthPeriod,
  InvoiceService,
} from "@/lib/invoice/service";
import { assertNoFailedMaintenanceResults } from "@/lib/maintenance/results";
import { getAutomatedNotificationStart } from "@/lib/notification-activation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    if (!hasValidCronSecret(req)) {
      return createErrorResponse("Unauthorized", 401);
    }

    const mode = req.nextUrl.searchParams.get("mode") || "current-month";
    const sendEmails = req.nextUrl.searchParams.get("sendEmails") !== "false";

    if (!["current-month", "previous-month", "retry-emails"].includes(mode)) {
      return createErrorResponse("mode must be current-month, previous-month, or retry-emails", 400);
    }

    if (mode === "retry-emails") {
      const retryResults = await InvoiceService.retryPendingInvoiceEmails(100);
      assertNoFailedMaintenanceResults(retryResults);
      return createSuccessResponse({
        mode,
        retried: retryResults.filter((result) => result.ok).length,
        total: retryResults.length,
        results: retryResults,
      });
    }

    const automationStart = getAutomatedNotificationStart();
    if (!automationStart) {
      return createSuccessResponse({
        mode,
        generated: 0,
        total: 0,
        results: [],
        retryResults: [],
        skipped: "Automation activation time is not configured",
      });
    }

    const period = mode === "previous-month"
      ? getPreviousMonthPeriod()
      : getCurrentMonthToDatePeriod();

    const results = await InvoiceService.processMonthlyOwnerInvoices({
      periodStart: period.start,
      periodEnd: period.end,
      sendEmails,
      createdAfter: automationStart,
    });

    const retryResults = await InvoiceService.retryPendingInvoiceEmails(100);
    assertNoFailedMaintenanceResults(results);
    assertNoFailedMaintenanceResults(retryResults);

    return createSuccessResponse({
      mode,
      period,
      generated: results.filter((result) => result.invoiceId).length,
      total: results.length,
      results,
      retryResults,
    });
  } catch (error) {
    return handleRouteError(error, "GET /api/cron/monthly-invoices");
  }
}
