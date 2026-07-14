import { Client } from "@upstash/qstash";

import { getValidatedBaseUrl } from "@/lib/utils";

export type QstashJobPayload = {
  job: "pending-approval-expiry" | "extension-expiry" | "additional-charge-expiry" | "auto-complete" | "booking-reminder" | "review-reminder";
  reservationId?: string;
  extensionId?: string;
  chargeId?: string;
};

export async function scheduleQstashJob(payload: QstashJobPayload, runAt: Date) {
  if (!(runAt instanceof Date) || !Number.isFinite(runAt.getTime())) {
    console.error("[QStash] Refusing to schedule a job with an invalid delivery time", { payload });
    return null;
  }

  const devMode = process.env.NODE_ENV !== "production"
    && (process.env.QSTASH_DEV === "true" || process.env.QSTASH_DEV === "1");
  const token = process.env.QSTASH_TOKEN;
  if (!devMode && !token) return null;

  const destination = process.env.QSTASH_DESTINATION_URL
    || `${getValidatedBaseUrl()}/api/cron/qstash`;
  let destinationUrl: URL;
  try {
    destinationUrl = new URL(destination);
  } catch {
    console.error("[QStash] Destination URL is invalid");
    return null;
  }
  if (!devMode && destinationUrl.protocol !== "https:") {
    console.error("[QStash] Production destination must use HTTPS");
    return null;
  }
  const delay = Math.max(0, Math.ceil((runAt.getTime() - Date.now()) / 1000));
  const entityId = payload.reservationId || payload.extensionId || payload.chargeId || "global";
  // A reschedule for a materially different due time must not be collapsed into
  // the existing delivery. Handlers are idempotent, so an already-delivered job
  // remains safe if a provider retry or reconciliation path overlaps it.
  const scheduleVersion = `-${Math.floor(runAt.getTime() / 1000)}`;
  const deduplicationId = `contcave-${payload.job}-${entityId}${scheduleVersion}`;
  const client = devMode ? new Client({ devMode: true }) : new Client({ token: token! });
  try {
    return await client.publishJSON({
      url: destination,
      body: payload,
      delay,
      retries: 5,
      timeout: 30,
      deduplicationId,
    });
  } catch (error) {
    console.error("[QStash] Failed to schedule job; reconciliation sweep remains responsible for recovery", {
      payload,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
