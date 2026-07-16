import { NextRequest } from "next/server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";
import { ensureInvoiceWithAttachment } from "@/lib/invoice/createInvoiceRecord";
import prisma from "@/lib/prismadb";

const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

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
    const { userId, reservationId, transactionId } = body;

    if (typeof userId !== "string" || !OBJECT_ID_PATTERN.test(userId.trim())) {
      return createErrorResponse("userId must be a valid id", 400);
    }

    if (userId !== currentUser.id) {
      return createErrorResponse("You can only generate invoices for your own account", 403);
    }

    if (typeof reservationId !== "string" || !OBJECT_ID_PATTERN.test(reservationId.trim())) {
      return createErrorResponse("reservationId must be a valid id", 400);
    }

    if (typeof transactionId !== "string" || !OBJECT_ID_PATTERN.test(transactionId.trim())) {
      return createErrorResponse("transactionId must be a valid id", 400);
    }

    const reservation = await prisma.reservation.findFirst({
      where: {
        id: reservationId.trim(),
        userId: currentUser.id,
      },
      select: { isApproved: true },
    });

    if (!reservation) {
      return createErrorResponse("Reservation not found", 404);
    }

    if (reservation.isApproved !== 1) {
      return createErrorResponse("Tax invoice is available only after booking confirmation", 409);
    }

    const { invoice } = await ensureInvoiceWithAttachment({
      userId: userId.trim(),
      reservationId: reservationId.trim(),
      transactionId: transactionId.trim(),
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
