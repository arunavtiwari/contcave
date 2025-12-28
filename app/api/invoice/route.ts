import { ensureInvoiceWithAttachment } from "@/lib/invoice/createInvoiceRecord";
import getCurrentUser from "@/app/actions/getCurrentUser";
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    if (!req.headers.get("content-type")?.includes("application/json")) {
      return createErrorResponse("Content-Type must be application/json", 415);
    }

    const currentUser = await getCurrentUser();
    if (!currentUser?.id) {
      return createErrorResponse("Unauthorized", 401);
    }

    const body = await req.json().catch(() => ({}));
    const { userId, reservationId, transactionId, amount } = body;

    if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
      return createErrorResponse("userId is required and must be a non-empty string", 400);
    }

    if (userId !== currentUser.id) {
      return createErrorResponse("You can only generate invoices for your own account", 403);
    }

    if (!reservationId || typeof reservationId !== "string" || reservationId.trim().length === 0) {
      return createErrorResponse("reservationId is required and must be a non-empty string", 400);
    }

    if (!transactionId || typeof transactionId !== "string" || transactionId.trim().length === 0) {
      return createErrorResponse("transactionId is required and must be a non-empty string", 400);
    }

    if (amount !== undefined && amount !== null) {
      if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0) {
        return createErrorResponse("amount must be a non-negative number if provided", 400);
      }
      if (amount > 10000000) {
        return createErrorResponse("amount exceeds maximum limit", 400);
      }
    }

    const { invoice } = await ensureInvoiceWithAttachment({
      userId: userId.trim(),
      reservationId: reservationId.trim(),
      transactionId: transactionId.trim(),
      amountOverride: amount != null ? Math.round(amount) : undefined,
    });

    return createSuccessResponse({
      invoiceUrl: invoice.invoiceUrl,
      invoiceId: invoice.id,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      const message = error.message;
      const notFoundMessages = new Set([
        "User not found",
        "Reservation not found",
        "Transaction not found",
      ]);
      const status = notFoundMessages.has(message)
        ? 404
        : message.includes("does not match") || message.includes("Unable to determine")
          ? 400
          : 500;

      return createErrorResponse(message, status);
    }
    return handleRouteError(error, "POST /api/invoice");
  }
}
