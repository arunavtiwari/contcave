import { NextResponse } from "next/server";
import { ensureInvoiceWithAttachment } from "@/lib/invoice/createInvoiceRecord";

export async function POST(req: Request) {
  try {
    const { userId, reservationId, transactionId, amount } = await req.json();

    if (!userId || !reservationId || !transactionId) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    const { invoice } = await ensureInvoiceWithAttachment({
      userId,
      reservationId,
      transactionId,
      amountOverride: amount,
    });

    return NextResponse.json({
      invoiceUrl: invoice.invoiceUrl,
      invoiceId: invoice.id,
    });
  } catch (error: any) {
    console.error("Invoice generation failed:", error);
    const message = error?.message || "Failed to generate invoice";
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
    return NextResponse.json({ message }, { status });
  }
}
