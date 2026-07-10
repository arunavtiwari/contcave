import { PutObjectCommand } from "@aws-sdk/client-s3";
import { PaymentVoucher, PaymentVoucherType, Prisma } from "@prisma/client";

import { escapeEmailHtml } from "@/lib/email/html";
import { AttachmentInput, sendEmail } from "@/lib/email/mailer";
import prisma from "@/lib/prismadb";
import { r2 } from "@/lib/storage/r2";
import { getBaseUrl } from "@/lib/utils";

import { generateVoucherPDFBuffer, VoucherPdfData } from "./pdfBlob";

const IST_TIME_ZONE = "Asia/Kolkata";
const MAX_TRANSACTION_RETRIES = 3;
const MAX_RETRY_COUNT = 5;
const DELIVERY_CLAIM_TIMEOUT_MS = 10 * 60 * 1000;
const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

type TxClient = Prisma.TransactionClient;

type VoucherResult = {
  voucher: PaymentVoucher;
  attachment?: AttachmentInput;
};

function assertObjectId(value: string, fieldName: string) {
  const normalized = value.trim();
  if (!OBJECT_ID_PATTERN.test(normalized)) throw new Error(`${fieldName} must be a valid id`);
  return normalized;
}

function getFinancialYear(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: IST_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const start = month >= 4 ? year : year - 1;
  return `${start}-${String(start + 1).slice(-2)}`;
}

function financialYearShort(financialYear: string) {
  const [start, end] = financialYear.split("-");
  return `${start.slice(-2)}${end}`;
}

function seriesFor(type: PaymentVoucherType) {
  return type === "REFUND_VOUCHER" ? "RFV" : "RV";
}

function formatVoucherNumber(type: PaymentVoucherType, financialYear: string, sequence: number) {
  return `${seriesFor(type)}-${financialYearShort(financialYear)}-${String(sequence).padStart(3, "0")}`;
}

function formatBookingTime(startTime?: string | null, endTime?: string | null) {
  return [startTime, endTime].filter(Boolean).join(" - ");
}

function formatInr(value: number) {
  return `Rs. ${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

async function allocateVoucherNumber(tx: TxClient, params: {
  voucherType: PaymentVoucherType;
  financialYear: string;
}) {
  const series = seriesFor(params.voucherType);
  const scopeKey = `${params.financialYear}:${series}:GLOBAL`;
  const record = await tx.paymentVoucherSequence.upsert({
    where: { scopeKey },
    create: {
      scopeKey,
      financialYear: params.financialYear,
      series,
      nextNumber: 2,
    },
    update: {
      nextNumber: { increment: 1 },
    },
  });
  const sequence = record.nextNumber - 1;

  return {
    sequence,
    voucherNumber: formatVoucherNumber(params.voucherType, params.financialYear, sequence),
  };
}

async function createVoucherWithIdempotency(params: {
  idempotencyKey: string;
  create: (tx: TxClient) => Promise<PaymentVoucher>;
}) {
  const existing = await prisma.paymentVoucher.findUnique({
    where: { idempotencyKey: params.idempotencyKey },
  });
  if (existing) return existing;

  for (let attempt = 1; attempt <= MAX_TRANSACTION_RETRIES; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        const already = await tx.paymentVoucher.findUnique({
          where: { idempotencyKey: params.idempotencyKey },
        });
        if (already) return already;

        await tx.paymentVoucherIdempotencyLock.create({
          data: { idempotencyKey: params.idempotencyKey },
        });

        return await params.create(tx);
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const locked = await prisma.paymentVoucher.findUnique({
          where: { idempotencyKey: params.idempotencyKey },
        });
        if (locked) return locked;
      }

      const message = error instanceof Error ? error.message : String(error);
      const retryable =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034"
        || /write conflict|deadlock|transaction failed/i.test(message);
      if (retryable && attempt < MAX_TRANSACTION_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 100));
        continue;
      }
      throw error;
    }
  }

  throw new Error("Voucher creation retry limit reached");
}

function buildAttachment(voucher: PaymentVoucher, buffer: Buffer): AttachmentInput {
  return {
    filename: `${voucher.voucherNumber}.pdf`,
    content: buffer.toString("base64"),
  };
}

async function downloadVoucherAttachment(voucher: PaymentVoucher): Promise<AttachmentInput | undefined> {
  if (!voucher.voucherUrl) return undefined;
  if (process.env.E2E_DISABLE_R2_UPLOAD === "true") return undefined;

  try {
    const res = await fetch(voucher.voucherUrl);
    if (!res.ok) throw new Error(`Voucher download failed (${res.status})`);
    const buffer = Buffer.from(await res.arrayBuffer());
    return buildAttachment(voucher, buffer);
  } catch (error) {
    console.error("[PaymentVoucherService] Voucher attachment download failed", error);
    return undefined;
  }
}

async function uploadVoucherPdf(params: { voucher: PaymentVoucher; pdfBuffer: Buffer }) {
  if (process.env.E2E_DISABLE_R2_UPLOAD === "true") {
    return `https://assets.contcave.com/e2e/vouchers/${params.voucher.id}/${params.voucher.voucherNumber}.pdf`;
  }

  const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME;
  if (!bucket) throw new Error("Missing R2 bucket config");
  const publicBaseUrl = process.env.NEXT_PUBLIC_CLOUDFLARE_PUBLIC_URL;
  if (!publicBaseUrl) throw new Error("Missing Cloudflare public URL config");

  const key = [
    "users",
    params.voucher.userId,
    "billing",
    "vouchers",
    params.voucher.financialYear,
    params.voucher.voucherType,
    params.voucher.id,
    `${params.voucher.voucherNumber}.pdf`,
  ].join("/");

  await r2.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: params.pdfBuffer,
    ContentType: "application/pdf",
  }));

  return `${publicBaseUrl.replace(/\/$/, "")}/${key}`;
}

async function auditVoucher(voucher: PaymentVoucher, action: string, metadata: Prisma.InputJsonObject = {}) {
  await prisma.auditLog.create({
    data: {
      userId: voucher.userId,
      action,
      resource: "PaymentVoucher",
      resourceId: voucher.id,
      metadata,
    },
  }).catch((error) => {
    console.error("[PaymentVoucherService] Audit log failed", error);
  });
}

async function renderAndStore(voucher: PaymentVoucher, pdfData: VoucherPdfData): Promise<VoucherResult> {
  const pdfBuffer = await generateVoucherPDFBuffer(pdfData);
  try {
    const voucherUrl = await uploadVoucherPdf({ voucher, pdfBuffer });
    const stored = await prisma.paymentVoucher.update({
      where: { id: voucher.id },
      data: {
        voucherUrl,
        generatedAt: voucher.generatedAt || new Date(),
        storedAt: new Date(),
        status: "EMAIL_PENDING",
      },
    });
    await auditVoucher(stored, "PAYMENT_VOUCHER_STORED", {
      voucherNumber: stored.voucherNumber,
      voucherType: stored.voucherType,
    });
    return { voucher: stored, attachment: buildAttachment(stored, pdfBuffer) };
  } catch (error) {
    await prisma.paymentVoucher.update({
      where: { id: voucher.id },
      data: {
        status: "EMAIL_FAILED",
        emailError: error instanceof Error ? error.message : "Voucher PDF storage failed",
      },
    });
    throw error;
  }
}

function voucherEmailHtml(voucher: PaymentVoucher, recipientName?: string | null) {
  const title = voucher.voucherType === "REFUND_VOUCHER" ? "refund voucher" : "payment receipt";
  const link = voucher.voucherUrl
    ? `<p><a href="${voucher.voucherUrl}" style="color:#111827;font-weight:600;">View PDF</a></p>`
    : "";
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8" /><title>${voucher.voucherNumber}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#374151;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table width="100%" style="max-width:560px;background:#ffffff;border-radius:8px;padding:32px;">
          <tr>
            <td style="font-size:15px;line-height:1.6;">
              <div style="margin-bottom:24px;text-align:left;">
                <img src="${getBaseUrl()}/assets/logo.png" alt="ContCave" style="height:36px;width:auto;display:block;" />
              </div>
              <p>Hi ${escapeEmailHtml(recipientName || "there")},</p>
              <p>Your ContCave ${title} <strong>${voucher.voucherNumber}</strong> is attached for your records.</p>
              <p><strong>Amount:</strong> ${formatInr(voucher.amount)}</p>
              ${link}
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0;" />
              <p style="font-size:13px;color:#9ca3af;line-height:1.6;margin:0;">ContCave by Arkanet Ventures LLP.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export class PaymentVoucherService {
  static async ensureReceiptVoucherForTransaction(transactionIdInput: string): Promise<VoucherResult> {
    return await this.ensureVoucherForTransaction(transactionIdInput, "RECEIPT_VOUCHER");
  }

  static async ensureRefundVoucherForTransaction(transactionIdInput: string, reason?: string | null): Promise<VoucherResult> {
    return await this.ensureVoucherForTransaction(transactionIdInput, "REFUND_VOUCHER", reason || undefined);
  }

  private static async ensureVoucherForTransaction(
    transactionIdInput: string,
    voucherType: PaymentVoucherType,
    reason?: string
  ): Promise<VoucherResult> {
    const transactionId = assertObjectId(transactionIdInput, "transactionId");
    const existing = await prisma.paymentVoucher.findUnique({
      where: { idempotencyKey: `${voucherType}:${transactionId}` },
    });
    if (existing?.voucherUrl && existing.storedAt) {
      return { voucher: existing, attachment: await downloadVoucherAttachment(existing) };
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        user: true,
        reservation: {
          include: {
            listing: true,
            paymentVouchers: {
              where: { voucherType: "RECEIPT_VOUCHER" },
              take: 1,
              orderBy: { createdAt: "desc" },
            },
          },
        },
      },
    });

    if (!transaction) throw new Error("Transaction not found");
    if (!transaction.reservation) throw new Error("Reservation not found");
    if (voucherType === "RECEIPT_VOUCHER" && transaction.status !== "SUCCESS") {
      throw new Error("Cannot create a receipt voucher for an unsuccessful transaction");
    }
    if (voucherType === "REFUND_VOUCHER" && transaction.status !== "REFUNDED") {
      throw new Error("Cannot create a refund voucher before the transaction is refunded");
    }

    const issuedAt = new Date();
    const financialYear = getFinancialYear(issuedAt);
    const idempotencyKey = `${voucherType}:${transaction.id}`;
    const linkedVoucher = voucherType === "REFUND_VOUCHER"
      ? transaction.reservation.paymentVouchers[0] || null
      : null;

    const voucher = await createVoucherWithIdempotency({
      idempotencyKey,
      create: async (tx) => {
        const allocated = await allocateVoucherNumber(tx, { voucherType, financialYear });

        return await tx.paymentVoucher.create({
          data: {
            voucherNumber: allocated.voucherNumber,
            userId: transaction.userId,
            reservationId: transaction.reservationId,
            transactionId: transaction.id,
            linkedVoucherId: linkedVoucher?.id || null,
            amount: transaction.amount,
            voucherUrl: "",
            voucherType,
            financialYear,
            issuedAt,
            generatedAt: issuedAt,
            sequence: allocated.sequence,
            idempotencyKey,
            status: "GENERATED",
            metadata: {
              bookingId: transaction.reservation?.bookingId,
              cfOrderId: transaction.cfOrderId,
              cfPaymentId: transaction.cfPaymentId,
              reason: reason || transaction.description || null,
            } as Prisma.InputJsonObject,
          },
        });
      },
    });

    const pdfData: VoucherPdfData = {
      voucherNumber: voucher.voucherNumber,
      voucherType,
      issuedAt,
      bookingId: transaction.reservation.bookingId,
      customerName: transaction.user.name || transaction.user.email || "Customer",
      studioName: transaction.reservation.listing.title,
      bookingDate: transaction.reservation.startDate,
      bookingTime: formatBookingTime(transaction.reservation.startTime, transaction.reservation.endTime),
      paymentRef: transaction.cfPaymentId || transaction.cfOrderId || transaction.cfTxnRef || transaction.id,
      amount: transaction.amount,
      note: reason,
    };

    await auditVoucher(voucher, "PAYMENT_VOUCHER_GENERATED", {
      voucherNumber: voucher.voucherNumber,
      voucherType,
    });
    return await renderAndStore(voucher, pdfData);
  }

  static async markEmailSent(voucherIdInput: string): Promise<PaymentVoucher> {
    const voucherId = assertObjectId(voucherIdInput, "voucherId");
    const voucher = await prisma.paymentVoucher.update({
      where: { id: voucherId },
      data: { status: "EMAIL_SENT", emailSentAt: new Date(), emailError: null },
    });
    await auditVoucher(voucher, "PAYMENT_VOUCHER_EMAIL_SENT", { voucherNumber: voucher.voucherNumber });
    return voucher;
  }

  static async markEmailFailed(voucherIdInput: string, error: unknown): Promise<PaymentVoucher> {
    const voucherId = assertObjectId(voucherIdInput, "voucherId");
    const message = error instanceof Error ? error.message : "Receipt/refund email failed";
    const voucher = await prisma.paymentVoucher.update({
      where: { id: voucherId },
      data: {
        status: "EMAIL_FAILED",
        emailError: message.slice(0, 500),
        retryCount: { increment: 1 },
      },
    });
    await auditVoucher(voucher, "PAYMENT_VOUCHER_EMAIL_FAILED", {
      voucherNumber: voucher.voucherNumber,
      error: message.slice(0, 300),
    });
    return voucher;
  }

  static async retryVoucherEmail(voucherIdInput: string): Promise<PaymentVoucher> {
    const voucherId = assertObjectId(voucherIdInput, "voucherId");
    const voucher = await prisma.paymentVoucher.findUnique({
      where: { id: voucherId },
      include: { user: true },
    });
    if (!voucher) throw new Error("Voucher not found");
    if (voucher.emailSentAt) return voucher;
    if (voucher.retryCount >= MAX_RETRY_COUNT) throw new Error("Receipt/refund email retry limit reached");
    if (!voucher.voucherUrl) {
      if (!voucher.transactionId) throw new Error("Receipt/refund PDF is not stored and cannot be regenerated");
      if (voucher.voucherType === "REFUND_VOUCHER") {
        await this.ensureRefundVoucherForTransaction(voucher.transactionId);
      } else {
        await this.ensureReceiptVoucherForTransaction(voucher.transactionId);
      }
      return await this.retryVoucherEmail(voucher.id);
    }
    if (!voucher.user.email) {
      return await prisma.paymentVoucher.update({
        where: { id: voucher.id },
        data: { status: "DELIVERY_BLOCKED", emailError: "Recipient email is missing" },
      });
    }

    const claim = await prisma.paymentVoucher.updateMany({
      where: {
        id: voucher.id,
        emailSentAt: null,
        OR: [
          { status: { not: "RETRYING" } },
          { status: "RETRYING", updatedAt: { lte: new Date(Date.now() - DELIVERY_CLAIM_TIMEOUT_MS) } },
        ],
      },
      data: {
        status: "RETRYING",
        emailError: null,
      },
    });
    if (claim.count !== 1) {
      const latest = await prisma.paymentVoucher.findUnique({ where: { id: voucher.id } });
      if (latest?.emailSentAt) return latest;
      throw new Error("Receipt/refund email delivery is already in progress");
    }

    if (process.env.E2E_DISABLE_EMAIL_SEND === "true") {
      return await this.markEmailSent(voucher.id);
    }

    try {
      const attachment = await downloadVoucherAttachment(voucher);
      if (!attachment) throw new Error("Receipt/refund attachment unavailable");
      await sendEmail({
        toEmail: voucher.user.email,
        toName: voucher.user.name || "",
        subject: `Your ContCave ${voucher.voucherType === "REFUND_VOUCHER" ? "refund voucher" : "payment receipt"} ${voucher.voucherNumber}`,
        html: voucherEmailHtml(voucher, voucher.user.name),
        attachments: [attachment],
      });
      return await this.markEmailSent(voucher.id);
    } catch (error) {
      await this.markEmailFailed(voucher.id, error);
      throw error;
    }
  }
}
