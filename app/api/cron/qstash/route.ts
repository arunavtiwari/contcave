import { Receiver } from "@upstash/qstash";
import { formatInTimeZone } from "date-fns-tz";
import { NextResponse } from "next/server";

import { isE2eEffectDisabled } from "@/lib/e2e-guards";
import { getCurrentMonthToDatePeriod, getPreviousMonthPeriod, InvoiceService } from "@/lib/invoice/service";
import { sendBookingReminderForReservation, sendBookingReminders } from "@/lib/maintenance/bookingReminders";
import { processAndRecordMaintenanceJob } from "@/lib/maintenance/logger";
import { runDueSplits } from "@/lib/maintenance/payoutSplits";
import { autoCompleteCheckedInReservations, expireAdditionalCharges, expireExtensionRequests, sendExtensionNudges } from "@/lib/maintenance/postBooking";
import { assertNoFailedMaintenanceResults } from "@/lib/maintenance/results";
import { ReservationService } from "@/lib/reservation/service";
import { ReviewReminderService } from "@/lib/review/reminders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type QstashJob =
  | "pending-approval-expiry"
  | "extension-expiry"
  | "additional-charge-expiry"
  | "auto-complete"
  | "booking-reminder"
  | "review-reminder"
  | "post-booking-fast"
  | "post-booking-complete"
  | "booking-reminders"
  | "payout-splits"
  | "invoice-retry"
  | "month-end-invoices";

function isQstashJob(value: unknown): value is QstashJob {
  return [
    "pending-approval-expiry",
    "extension-expiry",
    "additional-charge-expiry",
    "auto-complete",
    "booking-reminder",
    "review-reminder",
    "post-booking-fast",
    "post-booking-complete",
    "booking-reminders",
    "payout-splits",
    "invoice-retry",
    "month-end-invoices",
  ].includes(value as string);
}

function isObjectId(value: unknown): value is string {
  return typeof value === "string" && /^[a-f\d]{24}$/i.test(value);
}

function isLastDayInIndia(date = new Date()) {
  const today = formatInTimeZone(date, "Asia/Kolkata", "yyyy-MM-dd");
  const tomorrow = formatInTimeZone(new Date(date.getTime() + 24 * 60 * 60 * 1000), "Asia/Kolkata", "yyyy-MM-dd");
  return today.slice(0, 7) !== tomorrow.slice(0, 7);
}

function isFirstDayInIndia(date = new Date()) {
  const today = formatInTimeZone(date, "Asia/Kolkata", "dd");
  return today === "01";
}

async function handleQstashJob(body: { job?: unknown; reservationId?: unknown; extensionId?: unknown; chargeId?: unknown } | null) {
  if (!body || !isQstashJob(body.job)) {
    return NextResponse.json({ success: false, error: "Unknown QStash job" }, { status: 400 });
  }

  const startTime = Date.now();
  let rawResult: unknown = null;
  let executionError: unknown = null;

  try {
    if (body.job === "pending-approval-expiry") {
      if (!isObjectId(body.reservationId)) return NextResponse.json({ success: false, error: "A valid reservationId is required" }, { status: 400 });
      const results = await ReservationService.expirePendingApprovalReservations(new Date(), body.reservationId);
      assertNoFailedMaintenanceResults(results);
      rawResult = results;
    } else if (body.job === "extension-expiry") {
      if (!isObjectId(body.extensionId)) return NextResponse.json({ success: false, error: "A valid extensionId is required" }, { status: 400 });
      const results = await expireExtensionRequests(1, body.extensionId);
      rawResult = results;
    } else if (body.job === "additional-charge-expiry") {
      if (!isObjectId(body.chargeId)) return NextResponse.json({ success: false, error: "A valid chargeId is required" }, { status: 400 });
      const results = await expireAdditionalCharges(1, body.chargeId);
      rawResult = results;
    } else if (body.job === "auto-complete") {
      if (!isObjectId(body.reservationId)) return NextResponse.json({ success: false, error: "A valid reservationId is required" }, { status: 400 });
      const results = await autoCompleteCheckedInReservations(1, body.reservationId);
      assertNoFailedMaintenanceResults(results);
      rawResult = results;
    } else if (body.job === "booking-reminder") {
      if (!isObjectId(body.reservationId)) return NextResponse.json({ success: false, error: "A valid reservationId is required" }, { status: 400 });
      rawResult = await sendBookingReminderForReservation(body.reservationId);
    } else if (body.job === "review-reminder") {
      if (!isObjectId(body.reservationId)) return NextResponse.json({ success: false, error: "A valid reservationId is required" }, { status: 400 });
      rawResult = await ReviewReminderService.sendForReservation(body.reservationId);
    } else if (
      isE2eEffectDisabled("E2E_DISABLE_RECURRING_QSTASH")
      || isE2eEffectDisabled("E2E_DISABLE_EMAIL_SEND")
    ) {
      return NextResponse.json({ success: true, job: body.job, skipped: "Recurring QStash jobs are disabled for E2E isolation" });
    } else {
      switch (body.job) {
        case "post-booking-fast": {
          const [nudges, extensions, charges, approvals, reviewReminders] = await Promise.all([
            sendExtensionNudges(200),
            expireExtensionRequests(200),
            expireAdditionalCharges(200),
            ReservationService.expirePendingApprovalReservations(),
            ReviewReminderService.sendDue(),
          ]);
          assertNoFailedMaintenanceResults([...nudges, ...extensions, ...charges, ...approvals]);
          rawResult = { nudges, extensions, charges, approvals, reviewReminders };
          break;
        }
        case "post-booking-complete": {
          const results = await autoCompleteCheckedInReservations(200);
          assertNoFailedMaintenanceResults(results);
          rawResult = results;
          break;
        }
        case "booking-reminders": {
          const results = await sendBookingReminders();
          assertNoFailedMaintenanceResults(results);
          rawResult = results;
          break;
        }
        case "payout-splits": {
          const results = await runDueSplits();
          assertNoFailedMaintenanceResults(results);
          rawResult = results;
          break;
        }
        case "invoice-retry": {
          const results = await InvoiceService.retryPendingInvoiceEmails(100);
          assertNoFailedMaintenanceResults(results);
          rawResult = results;
          break;
        }
        case "month-end-invoices": {
          const isMonthEndRetry = isFirstDayInIndia();
          if (!isLastDayInIndia() && !isMonthEndRetry) {
            return NextResponse.json({ success: true, job: body.job, skipped: "Not the last day of the month in Asia/Kolkata" });
          }
          const period = isMonthEndRetry ? getPreviousMonthPeriod() : getCurrentMonthToDatePeriod();
          const results = await InvoiceService.processMonthlyOwnerInvoices({
            periodStart: period.start,
            periodEnd: period.end,
          });
          assertNoFailedMaintenanceResults(results);
          rawResult = results;
          break;
        }
      }
    }
  } catch (err) {
    executionError = err;
  }

  const summary = await processAndRecordMaintenanceJob(body.job, startTime, rawResult, executionError);

  if (!summary.success) {
    return NextResponse.json(
      {
        ...summary,
        raw: rawResult,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ...summary,
    raw: rawResult,
  });
}

export async function POST(request: Request) {
  const devMode = process.env.NODE_ENV !== "production"
    && (process.env.QSTASH_DEV === "true" || process.env.QSTASH_DEV === "1");
  const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;
  const signature = request.headers.get("Upstash-Signature");
  if ((!devMode && (!currentSigningKey || !nextSigningKey)) || !signature) {
    return NextResponse.json({ success: false, error: "QStash verification is not configured" }, { status: 503 });
  }

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > 10_000) {
    return NextResponse.json({ success: false, error: "Request body too large" }, { status: 413 });
  }
  try {
    const receiver = devMode
      ? new Receiver({ devMode: true })
      : new Receiver({ currentSigningKey: currentSigningKey!, nextSigningKey: nextSigningKey! });
    const requestUrl = new URL(request.url);
    const verificationUrls = devMode
      ? [
          request.url,
          `${requestUrl.protocol}//localhost${requestUrl.port ? `:${requestUrl.port}` : ""}${requestUrl.pathname}`,
          `${requestUrl.protocol}//127.0.0.1${requestUrl.port ? `:${requestUrl.port}` : ""}${requestUrl.pathname}`,
        ]
      : [request.url];
    const valid = (await Promise.all(
      [...new Set(verificationUrls)].map((url) => receiver.verify({ body: rawBody, signature, url }).catch(() => false)),
    )).some(Boolean);
    if (!valid) return NextResponse.json({ success: false, error: "Invalid QStash signature" }, { status: 401 });
  } catch (error) {
    console.error("[QStash] Signature verification failed", error);
    return NextResponse.json({ success: false, error: "Invalid QStash signature" }, { status: 401 });
  }

  let body: { job?: unknown; reservationId?: unknown; extensionId?: unknown; chargeId?: unknown } | null;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }
  return await handleQstashJob(body);
}
