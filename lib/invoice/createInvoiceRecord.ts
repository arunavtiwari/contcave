import { Invoice } from "@prisma/client";

import { GST_RATE } from "@/constants/gst";
import { AttachmentInput } from "@/lib/email/mailer";
import { generateInvoicePDFBlob } from "@/lib/invoice/pdfBlob";
import prisma from "@/lib/prismadb";

type CreateInvoiceParams = {
  userId: string;
  reservationId: string;
  transactionId: string;
  amountOverride?: number;
};

export type InvoiceWithAttachment = {
  invoice: Invoice;
  attachment?: AttachmentInput;
};



async function downloadInvoiceAttachment(
  invoice: Invoice
): Promise<AttachmentInput | undefined> {
  if (!invoice.invoiceUrl) return undefined;
  try {
    const res = await fetch(invoice.invoiceUrl);
    if (!res.ok) throw new Error(`Invoice download failed (${res.status})`);
    const buffer = Buffer.from(await res.arrayBuffer());
    return {
      filename: `${invoice.invoiceNumber || "invoice"}.pdf`,
      content: buffer.toString("base64"),
    };
  } catch (error) {
    console.error("Invoice attachment download error", error);
    return undefined;
  }
}

export async function ensureInvoiceWithAttachment(
  params: CreateInvoiceParams
): Promise<InvoiceWithAttachment> {
  const existing = await prisma.invoice.findFirst({
    where: { transactionId: params.transactionId },
    orderBy: { createdAt: "desc" },
  });
  if (existing) {
    const attachment = await downloadInvoiceAttachment(existing);
    return { invoice: existing, attachment };
  }

  const { userId, reservationId, transactionId, amountOverride } = params;

  const [user, reservation, transaction] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      include: {
        billingDetails: { where: { isDefault: true }, take: 1 },
      },
    }),
    prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        listing: {
          include: {
            user: {
              include: { paymentDetails: true },
            },
          },
        },
      },
    }),
    prisma.transaction.findUnique({ where: { id: transactionId } }),
  ]);

  if (!user) throw new Error("User not found");
  if (!reservation) throw new Error("Reservation not found");
  if (!transaction) throw new Error("Transaction not found");

  if (
    transaction.userId !== userId ||
    (transaction.reservationId && transaction.reservationId !== reservationId)
  ) {
    throw new Error(
      "Transaction does not match the provided user/reservation pair"
    );
  }

  // Determine GST ownership and invoice details
  let ownerPayment = null;
  const rawPaymentDetails = reservation.listing?.user?.paymentDetails;

  if (rawPaymentDetails) {
    try {
      const { decryptPaymentDetailsInternal } = await import("@/lib/payment-details");
      const decrypted = decryptPaymentDetailsInternal(rawPaymentDetails as import("@prisma/client").PaymentDetails);

      if (decrypted.companyName && decrypted.gstin) {
        ownerPayment = {
          companyName: decrypted.companyName,
          gstin: decrypted.gstin,
          ownerName:
            reservation.listing!.user!.name ||
            reservation.listing!.user!.email ||
            "Listing Owner",
        };
      }
    } catch (error) {
      console.error("Failed to decrypt owner payment details for invoice:", error);
      // Fallback to Arkanet GST (ownerPayment remains null)
    }
  }

  const billing = user.billingDetails?.[0] ?? null;

  const totalAmountSource =
    amountOverride ?? transaction.amount ?? reservation.totalPrice;
  if (!totalAmountSource || totalAmountSource <= 0) {
    throw new Error("Unable to determine invoice amount");
  }

  const baseAmount = totalAmountSource / (1 + GST_RATE);
  const amount = Number(baseAmount.toFixed(2));
  const gstAmount = Number((totalAmountSource - amount).toFixed(2));
  const totalAmount = Number((amount + gstAmount).toFixed(2));
  const invoiceNumber = `CC-${Date.now()}`;

  const pdfBlob = await generateInvoicePDFBlob({
    invoiceNumber,
    user,
    billing,
    ownerPayment,
    amount,
    gstAmount,
    totalAmount,
    reservationId,
    bookingId: reservation.bookingId,
  });

  const arrayBuffer = await pdfBlob.arrayBuffer();
  const pdfBuffer = Buffer.from(arrayBuffer);
  const attachment: AttachmentInput = {
    filename: `${invoiceNumber}.pdf`,
    content: pdfBuffer.toString("base64"),
  };

  const folder = `users/${user.id}/invoices`;
  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = `reservation_${reservationId}_${timestamp}`;
  const key = `${folder}/${publicId}.pdf`;

  const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME;
  if (!bucket) throw new Error("Missing R2 bucket config");

  const { PutObjectCommand } = await import("@aws-sdk/client-s3");
  const { r2 } = await import("@/lib/storage/r2");

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: pdfBuffer,
    ContentType: "application/pdf"
  });

  try {
    await r2.send(command);
  } catch (error) {
    console.error("R2 invoice upload error:", error);
    throw new Error("R2 upload failed");
  }

  const secureUrl = `${process.env.NEXT_PUBLIC_CLOUDFLARE_PUBLIC_URL}/${key}`;

  const invoiceRecord = await prisma.invoice.create({
    data: {
      userId,
      reservationId,
      transactionId,
      billingId: billing?.id,
      amount,
      gstAmount,
      totalAmount,
      invoiceNumber,
      invoiceUrl: secureUrl,
    },
  });

  return { invoice: invoiceRecord, attachment };
}
