import { NextRequest } from "next/server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";
import prisma from "@/lib/prismadb";
import { ReservationService } from "@/lib/reservation/service";
import { TransactionService } from "@/lib/transaction/service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (process.env.E2E_ENABLE_CASHFREE_SIMULATOR !== "true") {
    return createErrorResponse("Not found", 404);
  }

  const externalEffectsDisabled = [
    process.env.E2E_DISABLE_EMAIL_SEND,
    process.env.E2E_DISABLE_WHATSAPP_SEND,
    process.env.E2E_DISABLE_R2_UPLOAD,
    process.env.E2E_DISABLE_CASHFREE_REFUND,
  ].every((value) => value === "true");
  if (!externalEffectsDisabled) {
    return createErrorResponse("E2E simulator external-effect guards are not enabled", 503);
  }

  try {
    const currentUser = await getCurrentUser();
    if (!currentUser?.id) return createErrorResponse("Unauthorized", 401);

    const body = (await req.json().catch(() => ({}))) as { tid?: string };
    const tid = body.tid?.trim();
    if (!tid) return createErrorResponse("Missing transaction id", 400);

    const txn = await prisma.transaction.findFirst({
      where: { cfTxnRef: tid },
      orderBy: { createdAt: "desc" },
    });
    if (!txn) return createErrorResponse("Transaction not found", 404);
    if (txn.userId !== currentUser.id) return createErrorResponse("Forbidden", 403);
    if (txn.status !== "PENDING" && txn.status !== "SUCCESS") {
      return createErrorResponse(`Cannot complete transaction in ${txn.status} state`, 409);
    }

    const cfPaymentId = `e2e_cf_payment_${txn.id}`;
    await TransactionService.updateStatus({
      txnId: txn.id,
      status: "SUCCESS",
      cfPaymentId,
      webhookPayload: {
        e2e: true,
        order_id: txn.cfOrderId,
        transaction_id: txn.cfTxnRef,
        payment_status: "SUCCESS",
        cf_payment_id: cfPaymentId,
      },
      signature: "e2e-simulator",
    });

    const result = await ReservationService.createFromTransaction(txn.id);
    return createSuccessResponse({ transactionId: txn.id, reservationId: result?.reservationId ?? txn.reservationId });
  } catch (error) {
    return handleRouteError(error, "POST /api/payments/cashfree/e2e-complete");
  }
}
