import { ensureInvoiceWithAttachment } from "@/lib/invoice/createInvoiceRecord";
import { createErrorResponse, createSuccessResponse } from "@/lib/api-utils";

export async function POST(req: Request) {
  try {
    const { userId, reservationId, transactionId, amount } = await req.json();

    if (!userId || !reservationId || !transactionId) {
      return createErrorResponse("Missing required fields: userId, reservationId, or transactionId", 400);
    }

    const { invoice } = await ensureInvoiceWithAttachment({
      userId,
      reservationId,
      transactionId,
      amountOverride: amount,
    });

    return createSuccessResponse({
      invoiceUrl: invoice.invoiceUrl,
      invoiceId: invoice.id,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to generate invoice";
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
}
