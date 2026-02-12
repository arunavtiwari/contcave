import { Invoice } from "@prisma/client";
import crypto from "crypto";

import { hasValidGST } from "@/lib/constants/gst";
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

const CLOUDINARY_UPLOAD_URL = "https://api.cloudinary.com/v1_1";

const CLOUDINARY_SIGN_KEYS = new Set([
  "timestamp",
  "folder",
  "public_id",
  "eager",
  "transformation",
  "context",
  "tags",
  "upload_preset",
  "source",
  "type",
  "invalidate",
]);

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

type CloudinaryParams = {
  folder?: string;
  timestamp?: number;
  public_id?: string;
  eager?: string;
  transformation?: string;
  context?: string;
  tags?: string[];
  upload_preset?: string;
  source?: string;
  type?: string;
  invalidate?: boolean;
};

function signCloudinaryParams(params: CloudinaryParams, apiSecret: string) {
  const toSign = (Object.keys(params) as Array<keyof CloudinaryParams>)
    .filter((key) => CLOUDINARY_SIGN_KEYS.has(key) && params[key] != null)
    .sort()
    .map((key) => {
      const value = params[key] as JsonValue;
      return `${key}=${typeof value === "string" ? value : JSON.stringify(value)}`;
    })
    .join("&");

  return crypto.createHash("sha1").update(`${toSign}${apiSecret}`).digest("hex");
}

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
  const ownerPayment =
    hasValidGST(reservation.listing?.user?.paymentDetails)
      ? {
        companyName: reservation.listing!.user!.paymentDetails!.companyName!,
        gstin: reservation.listing!.user!.paymentDetails!.gstin!,
        ownerName:
          reservation.listing!.user!.name ||
          reservation.listing!.user!.email ||
          "Listing Owner",
      }
      : null;

  const billing = user.billingDetails?.[0] ?? null;

  const totalAmountSource =
    amountOverride ?? transaction.amount ?? reservation.totalPrice;
  if (!totalAmountSource || totalAmountSource <= 0) {
    throw new Error("Unable to determine invoice amount");
  }

  const gstRate = 0.18;
  const baseAmount = totalAmountSource / (1 + gstRate);
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
  });

  const arrayBuffer = await pdfBlob.arrayBuffer();
  const pdfBuffer = Buffer.from(arrayBuffer);
  const attachment: AttachmentInput = {
    filename: `${invoiceNumber}.pdf`,
    content: pdfBuffer.toString("base64"),
  };

  const folder = "invoices";
  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = `reservation_${reservationId}_${timestamp}`;

  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const apiKey =
    process.env.CLOUDINARY_API_KEY ||
    process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;
  const cloudName =
    process.env.CLOUDINARY_CLOUD_NAME ||
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

  if (!apiSecret || !apiKey || !cloudName) {
    throw new Error("Missing Cloudinary credentials");
  }

  const paramsToSign: CloudinaryParams = { folder, timestamp, public_id: publicId };
  const signature = signCloudinaryParams(paramsToSign, apiSecret);

  const formData = new FormData();
  formData.append("file", pdfBlob, `${publicId}.pdf`);
  formData.append("folder", folder);
  formData.append("timestamp", String(timestamp));
  formData.append("public_id", publicId);
  formData.append("api_key", apiKey);
  formData.append("signature", signature);

  const uploadRes = await fetch(
    `${CLOUDINARY_UPLOAD_URL}/${cloudName}/image/upload`,
    {
      method: "POST",
      body: formData,
    }
  );
  const uploadData = await uploadRes.json();
  if (!uploadRes.ok || !uploadData?.secure_url)
    throw new Error(uploadData?.error?.message || "Cloudinary upload failed");

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
      invoiceUrl: uploadData.secure_url,
    },
  });

  return { invoice: invoiceRecord, attachment };
}
