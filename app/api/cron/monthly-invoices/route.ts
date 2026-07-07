import { NextRequest } from "next/server";

import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";
import {
  getCurrentMonthToDatePeriod,
  getPreviousMonthPeriod,
  InvoiceService,
} from "@/lib/invoice/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function assertCronSecret(req: NextRequest) {
  const provided = req.headers.get("x-github-secret") || req.headers.get("x-cron-secret");
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const expected = process.env.CRON_SECRET;
  return Boolean(expected && (provided === expected || bearer === expected));
}

export async function GET(req: NextRequest) {
  try {
    if (!assertCronSecret(req)) {
      return createErrorResponse("Unauthorized", 401);
    }

    const mode = req.nextUrl.searchParams.get("mode") || "current-month";
    const sendEmails = req.nextUrl.searchParams.get("sendEmails") !== "false";

    if (!["current-month", "previous-month", "retry-emails"].includes(mode)) {
      return createErrorResponse("mode must be current-month, previous-month, or retry-emails", 400);
    }

    if (mode === "retry-emails") {
      const retryResults = await InvoiceService.retryPendingInvoiceEmails(100);
      return createSuccessResponse({
        mode,
        retried: retryResults.filter((result) => result.ok).length,
        total: retryResults.length,
        results: retryResults,
      });
    }

    const period = mode === "previous-month"
      ? getPreviousMonthPeriod()
      : getCurrentMonthToDatePeriod();

    const results = await InvoiceService.processMonthlyOwnerInvoices({
      periodStart: period.start,
      periodEnd: period.end,
      sendEmails,
    });

    const retryResults = await InvoiceService.retryPendingInvoiceEmails(100);

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
