import { cfMapStatus, cfVerifyWebhookSignature } from "@/lib/cashfree/cashfree";
import { ReservationService } from "@/lib/reservation/service";
import { TransactionService } from "@/lib/transaction/service";

type CashfreeWebhookPayload = {
  data?: {
    order?: { order_id?: string };
    payment?: { payment_status?: string; cf_payment_id?: string | number };
  };
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

function pickOrderId(p: CashfreeWebhookPayload) { return String(p?.data?.order?.order_id ?? ""); }
function pickPayStatus(p: CashfreeWebhookPayload) { return String(p?.data?.payment?.payment_status ?? ""); }
function pickPaymentId(p: CashfreeWebhookPayload) {
  const r = p?.data?.payment?.cf_payment_id;
  return r != null ? String(r) : undefined;
}

export async function handleCashfreeWebhook(input: HandleInput): Promise<{ statusCode: number }> {
  try {
    const { raw, headers } = input;

    if (headers.strict) {
      const okSig = headers.timestamp && headers.signature &&
        cfVerifyWebhookSignature({ rawBody: raw, timestamp: headers.timestamp, signatureBase64: headers.signature });
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

    if (txn.status !== status || txn.cfPaymentId !== cfPaymentId) {
      await TransactionService.updateStatus({
        txnId: txn.id,
        status,
        cfPaymentId,
        webhookPayload: body,
        signature: headers.signature
      });
    }

    if (status === "SUCCESS" && txn.userId && txn.listingId) {
      const result = await ReservationService.createFromTransaction(txn.id);
      if (result) {
        console.warn("[Webhook] Reservation processed via Service", { txnId: txn.id, reservationId: result.reservationId });
      }
    }

    if (status === "FAILED" && txn.id) {
      console.warn("[Webhook] Payment failed for transaction", { txnId: txn.id });
    }

    return { statusCode: 200 };
  } catch (error) {
    console.error("[Webhook] UNHANDLED error", { error: error instanceof Error ? error.message : String(error) });
    return { statusCode: 500 };
  }
}
