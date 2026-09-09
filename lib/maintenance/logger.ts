import { Prisma } from "@prisma/client";

import prisma from "@/lib/prismadb";

export interface NormalizedItem {
  id: string;
  status: string;
  ok?: boolean;
  error?: string;
  [key: string]: unknown;
}

export interface MaintenanceExecutionSummary {
  success: boolean;
  job: string;
  actionTaken: boolean;
  itemsProcessed: number;
  itemsModified: number;
  summary: string;
  durationMs: number;
  details?: unknown;
  error?: string;
}

function normalizeItems(rawResult: unknown): NormalizedItem[] {
  if (!rawResult || typeof rawResult !== "object") return [];

  // Single item result (e.g. { id, status } or { reservationId, status })
  if (!Array.isArray(rawResult)) {
    const obj = rawResult as Record<string, unknown>;
    
    // Check if it's a composite object containing arrays (e.g. post-booking-fast: { nudges, extensions, charges, ... })
    const arrayKeys = Object.keys(obj).filter((key) => Array.isArray(obj[key]));
    if (arrayKeys.length > 0) {
      const combined: NormalizedItem[] = [];
      for (const key of arrayKeys) {
        const arr = obj[key] as unknown[];
        for (const item of arr) {
          if (item && typeof item === "object") {
            const itemObj = item as Record<string, unknown>;
            combined.push({
              id: String(itemObj.id || itemObj.invoiceId || itemObj.reservationId || itemObj.chargeId || itemObj.extensionId || "unknown"),
              status: String(itemObj.status || (typeof itemObj.ok === "boolean" ? (itemObj.ok ? "sent" : "failed") : "processed")),
              ok: typeof itemObj.ok === "boolean" ? itemObj.ok : undefined,
              error: itemObj.error ? String(itemObj.error) : undefined,
              source: key,
            });
          }
        }
      }
      return combined;
    }

    if ("id" in obj || "reservationId" in obj || "invoiceId" in obj || "status" in obj) {
      return [{
        id: String(obj.id || obj.reservationId || obj.invoiceId || "unknown"),
        status: String(obj.status || (typeof obj.ok === "boolean" ? (obj.ok ? "sent" : "failed") : "processed")),
        ok: typeof obj.ok === "boolean" ? obj.ok : undefined,
        error: obj.error ? String(obj.error) : undefined,
      }];
    }
    return [];
  }

  return rawResult.map((item) => {
    if (!item || typeof item !== "object") {
      return { id: "unknown", status: String(item) };
    }
    const itemObj = item as Record<string, unknown>;
    return {
      id: String(itemObj.id || itemObj.invoiceId || itemObj.reservationId || itemObj.chargeId || itemObj.extensionId || "unknown"),
      status: String(itemObj.status || (typeof itemObj.ok === "boolean" ? (itemObj.ok ? "sent" : "failed") : "processed")),
      ok: typeof itemObj.ok === "boolean" ? itemObj.ok : undefined,
      error: itemObj.error ? String(itemObj.error) : undefined,
    };
  });
}

function generateHumanSummary(jobName: string, itemsModified: number, totalProcessed: number, error?: string): string {
  if (error) return `Error during ${jobName}: ${error}`;
  if (itemsModified === 0) {
    return totalProcessed === 0 ? "0 records due - skipped" : `Processed ${totalProcessed} record(s) - all skipped`;
  }

  switch (jobName) {
    case "auto-complete":
    case "post-booking-complete":
      return `Auto-completed ${itemsModified} booking(s)`;
    case "pending-approval-expiry":
      return `Auto-cancelled ${itemsModified} expired pending approval booking(s)`;
    case "extension-expiry":
      return `Expired ${itemsModified} pending extension request(s)`;
    case "additional-charge-expiry":
      return `Expired ${itemsModified} pending additional charge(s)`;
    case "booking-reminder":
    case "booking-reminders":
      return `Sent ${itemsModified} booking reminder(s) via WhatsApp`;
    case "review-reminder":
      return `Sent ${itemsModified} review reminder email(s)`;
    case "payout-splits":
      return `Processed ${itemsModified} payout split(s) via Cashfree`;
    case "invoice-retry":
      return `Retried ${itemsModified} pending invoice email(s)`;
    case "month-end-invoices":
      return `Generated ${itemsModified} month-end owner invoice(s)`;
    case "post-booking-fast":
      return `Executed fast maintenance: modified ${itemsModified} item(s)`;
    default:
      return `Modified ${itemsModified} record(s) for ${jobName}`;
  }
}

export async function processAndRecordMaintenanceJob(
  jobName: string,
  startTime: number,
  rawResult: unknown,
  executionError?: unknown
): Promise<MaintenanceExecutionSummary> {
  const durationMs = Math.max(1, Date.now() - startTime);
  const items = normalizeItems(rawResult);

  const errorString = executionError
    ? (executionError instanceof Error ? executionError.message : String(executionError))
    : undefined;

  // Items are considered modified if their status is not 'skipped'
  const modifiedItems = items.filter((item) => {
    const s = item.status.toLowerCase();
    return s !== "skipped" && s !== "already_sent";
  });

  const hasFailures = Boolean(errorString) || items.some((item) => item.ok === false || item.status.toLowerCase() === "failed");
  const itemsModified = modifiedItems.length;
  const itemsProcessed = items.length;

  const summary = generateHumanSummary(jobName, itemsModified, itemsProcessed, errorString);

  // Status computation
  let status: "SUCCESS" | "FAILED" | "PARTIAL" = "SUCCESS";
  if (hasFailures) {
    status = itemsModified > 0 ? "PARTIAL" : "FAILED";
  }

  // Selective persistence: Only write to MongoDB if items were modified or if a failure occurred
  if (itemsModified > 0 || hasFailures) {
    try {
      await prisma.maintenanceJobLog.create({
        data: {
          jobName,
          status,
          itemsProcessed,
          itemsModified,
          summary,
          details: (modifiedItems.length > 0 ? modifiedItems : (errorString ? [{ error: errorString }] : [])) as unknown as Prisma.InputJsonValue,
          error: errorString || null,
          durationMs,
        },
      });
    } catch (dbError) {
      console.error("[MaintenanceLogger] Failed to write job log to database:", dbError);
    }
  }

  return {
    success: !hasFailures,
    job: jobName,
    actionTaken: itemsModified > 0,
    itemsProcessed,
    itemsModified,
    summary,
    durationMs,
    details: modifiedItems.length > 0 ? modifiedItems : undefined,
    error: errorString,
  };
}
