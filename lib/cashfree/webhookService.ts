import { cfMapStatus, cfVerifyWebhookSignature } from "@/lib/cashfree/cashfree";
import { ReservationService } from "@/lib/reservation/service";
import { TransactionService } from "@/lib/transaction/service";

type CashfreeWebhookPayload = {
  data?: {
    order?: { order_id?: string; order_status?: string };
    payment?: { payment_status?: string; cf_payment_id?: string | number };
  };
  order_id?: string;
  cf_order_id?: string;
  transaction_id?: string;
  cf_payment_id?: string | number;
  order_status?: string;
  payment_status?: string;
  [key: string]: unknown;
};

const MAX_SKEW_SEC = Number(process.env.WEBHOOK_MAX_SKEW_SEC || 600);

type HandleInput = {
  raw: string;
  headers: { timestamp: string; signature: string; strict: boolean };
};

function parseWebhookTimestamp(ts: string): number | null {
  if (!ts) return null;
  if (/^\d+$/.test(ts)) {
    const n = Number(ts);
    return n > 1e12 ? n : n * 1000;
  }
  const d = Date.parse(ts);
  return Number.isFinite(d) ? d : null;
}
function fresh(tsHeader: string): boolean {
  const t = parseWebhookTimestamp(tsHeader);
  if (!t) return false;
  const skew = Math.abs(Date.now() - t) / 1000;
  return skew <= MAX_SKEW_SEC;
}

function pickOrderId(p: CashfreeWebhookPayload) {
  return String(p?.data?.order?.order_id ?? p.order_id ?? p.cf_order_id ?? p.transaction_id ?? "");
}
function pickPayStatus(p: CashfreeWebhookPayload) {
  return String(
    p?.data?.payment?.payment_status ??
    p?.data?.order?.order_status ??
    p.payment_status ??
    p.order_status ??
    ""
  );
}
function pickPaymentId(p: CashfreeWebhookPayload) {
  const r = p?.data?.payment?.cf_payment_id ?? p.cf_payment_id;
  return r != null ? String(r) : undefined;
}

function verifySignature(raw: string, headers: HandleInput["headers"]) {
  try {
    return Boolean(headers.timestamp && headers.signature &&
      cfVerifyWebhookSignature({ rawBody: raw, timestamp: headers.timestamp, signatureBase64: headers.signature }));
  } catch (error) {
    console.error("[Webhook] Signature verification failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

function shouldApplyWebhookStatus(currentStatus: string, incomingStatus: string) {
  if (currentStatus === incomingStatus) return false;
  if (incomingStatus === "PENDING") return false;
  if (currentStatus === "SUCCESS" && incomingStatus !== "SUCCESS") return false;
  if (currentStatus === "FAILED" && incomingStatus !== "SUCCESS") return false;
  return true;
}

export async function handleCashfreeWebhook(input: HandleInput): Promise<{ statusCode: number }> {
  try {
    const { raw, headers } = input;

    if (headers.strict) {
      const okSig = verifySignature(raw, headers);
      if (!okSig || !fresh(headers.timestamp)) return { statusCode: 401 };
    }

    let body: CashfreeWebhookPayload;
    try { body = JSON.parse(raw); } catch { return { statusCode: 200 }; }

    const orderId = pickOrderId(body);
    if (!orderId) return { statusCode: 200 };

    const cfPaymentId = pickPaymentId(body);
    const status = cfMapStatus(pickPayStatus(body));
    console.warn("[Webhook] Cashfree payment status", { orderId, status, cfPaymentId });

    const txn = await TransactionService.findByOrderId(orderId);
    if (!txn) return { statusCode: 200 };

    if (status === "SUCCESS" && txn.userId && txn.listingId) {
      const result = await ReservationService.createFromTransaction(txn.id);
      if (result) {
        await TransactionService.updateStatus({
          txnId: txn.id,
          status,
          cfPaymentId,
          webhookPayload: body,
          signature: headers.signature
        });
        console.warn("[Webhook] Reservation processed via Service", { txnId: txn.id, reservationId: result.reservationId });
      } else {
        await TransactionService.updateWebhookMetadata({
          txnId: txn.id,
          cfPaymentId,
          webhookPayload: body,
          signature: headers.signature
        });
        console.warn("[Webhook] Payment succeeded but reservation was not created; local transaction status preserved", { txnId: txn.id });
      }
    } else if (shouldApplyWebhookStatus(txn.status, status) || txn.cfPaymentId !== cfPaymentId) {
      await TransactionService.updateStatus({
        txnId: txn.id,
        status: shouldApplyWebhookStatus(txn.status, status) ? status : txn.status,
        cfPaymentId,
        webhookPayload: body,
        signature: headers.signature
      });
    }

    if (status === "FAILED" && txn.id) {
      console.warn("[Webhook] Payment failed for transaction", { txnId: txn.id });
      await ReservationService.handleFailedPayment(txn.id).catch((error) => {
        console.error("[Webhook] Failed-payment notification failed", {
          txnId: txn.id,
          error: error instanceof Error ? error.message : String(error),
        });
      });
    }

    return { statusCode: 200 };
  } catch (error) {
    console.error("[Webhook] UNHANDLED error", { error: error instanceof Error ? error.message : String(error) });
    return { statusCode: 500 };
  }
}
