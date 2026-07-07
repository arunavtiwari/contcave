import { PutObjectCommand } from "@aws-sdk/client-s3";
import {
  Invoice,
  InvoiceDocumentType,
  PaymentDetails,
  Prisma,
} from "@prisma/client";

import { ARKANET_VENTURES_GST, DEFAULT_SAC_CODE, GST_RATE, PLATFORM_COMMISSION_PERCENT } from "@/constants/gst";
import { GST_STATE_NAMES_BY_CODE, isValidGstStateCode } from "@/constants/gstStateCodes";
import { AttachmentInput, sendEmail } from "@/lib/email/mailer";
import { decryptPaymentDetailsInternal } from "@/lib/payment-details";
import prisma from "@/lib/prismadb";
import { r2 } from "@/lib/storage/r2";
import { getBaseUrl } from "@/lib/utils";

import { generateInvoicePDFBlob, InvoiceLineItem, InvoiceParty, InvoicePDFData, InvoiceTaxBreakup } from "./pdfBlob";

const IST_TIME_ZONE = "Asia/Kolkata";
const MAX_RETRY_COUNT = 5;
const MAX_TRANSACTION_RETRIES = 3;
const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;
const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const MAX_GST_INVOICE_NUMBER_LENGTH = 16;

type TxClient = Prisma.TransactionClient;

type MonthlyInvoiceResult = {
  invoice: Invoice;
  attachment?: AttachmentInput;
};

type MonthPeriod = {
  start: Date;
  end: Date;
  key: string;
};

function roundMoney(value: number) {
  return Number((Math.round((value + Number.EPSILON) * 100) / 100).toFixed(2));
}

function normalizeGstin(value: string | null | undefined) {
  return value?.trim().toUpperCase().replace(/\s+/g, "") || "";
}

function assertValidGstin(value: string | null | undefined, label: string) {
  const gstin = normalizeGstin(value);
  if (!GSTIN_PATTERN.test(gstin)) {
    throw new Error(`${label} GSTIN is missing or malformed`);
  }
  if (!isValidGstStateCode(gstin.slice(0, 2))) {
    throw new Error(`${label} GSTIN has an invalid state code`);
  }
  return gstin;
}

function assertPropertyStateCode(value: string | null | undefined) {
  const code = value?.trim();
  if (!isValidGstStateCode(code)) {
    throw new Error("Listing property GST state code is missing or invalid; backfill it before invoice generation");
  }
  return code as string;
}

function calculateTaxBreakup(taxableValueInput: number, supplierGstinInput: string, posStateCode: string): InvoiceTaxBreakup {
  const taxableValue = roundMoney(taxableValueInput);
  const supplierGstin = assertValidGstin(supplierGstinInput, "Supplier");
  const supplierStateCode = supplierGstin.slice(0, 2);

  if (supplierStateCode === posStateCode) {
    const cgstAmount = roundMoney(taxableValue * (GST_RATE / 2));
    const sgstAmount = roundMoney(taxableValue * (GST_RATE / 2));
    return {
      taxableValue,
      cgstRate: GST_RATE / 2,
      cgstAmount,
      sgstRate: GST_RATE / 2,
      sgstAmount,
      igstRate: 0,
      igstAmount: 0,
      totalTax: roundMoney(cgstAmount + sgstAmount),
    };
  }

  const igstAmount = roundMoney(taxableValue * GST_RATE);
  return {
    taxableValue,
    cgstRate: 0,
    cgstAmount: 0,
    sgstRate: 0,
    sgstAmount: 0,
    igstRate: GST_RATE,
    igstAmount,
    totalTax: igstAmount,
  };
}

function zeroTaxBreakup(taxableValue: number): InvoiceTaxBreakup {
  return {
    taxableValue: roundMoney(taxableValue),
    cgstRate: 0,
    cgstAmount: 0,
    sgstRate: 0,
    sgstAmount: 0,
    igstRate: 0,
    igstAmount: 0,
    totalTax: 0,
  };
}

function applyTaxToLineItem(item: InvoiceLineItem, tax: InvoiceTaxBreakup): InvoiceLineItem {
  return {
    ...item,
    cgstRate: tax.cgstRate,
    cgstAmount: tax.cgstAmount,
    sgstRate: tax.sgstRate,
    sgstAmount: tax.sgstAmount,
    igstRate: tax.igstRate,
    igstAmount: tax.igstAmount,
  };
}

function applyTaxRatesToLineItem(item: InvoiceLineItem, tax: InvoiceTaxBreakup): InvoiceLineItem {
  return {
    ...item,
    cgstRate: tax.cgstRate,
    cgstAmount: roundMoney(item.taxableValue * tax.cgstRate),
    sgstRate: tax.sgstRate,
    sgstAmount: roundMoney(item.taxableValue * tax.sgstRate),
    igstRate: tax.igstRate,
    igstAmount: roundMoney(item.taxableValue * tax.igstRate),
  };
}

function assertObjectId(value: string, fieldName: string) {
  const normalized = value.trim();
  if (!OBJECT_ID_PATTERN.test(normalized)) throw new Error(`${fieldName} must be a valid id`);
  return normalized;
}

function formatInr(value: number) {
  return `Rs. ${roundMoney(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDateIST(value: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: IST_TIME_ZONE,
  }).format(value);
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

function getMonthKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: IST_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
  }).format(date);
}

export function getPreviousMonthPeriod(reference = new Date()): MonthPeriod {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: IST_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(reference);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const startUtc = new Date(Date.UTC(year, month - 2, 1, -5, -30, 0, 0));
  const endUtc = new Date(Date.UTC(year, month - 1, 1, -5, -30, -1, 999));
  return { start: startUtc, end: endUtc, key: getMonthKey(startUtc) };
}

export function getCurrentMonthToDatePeriod(reference = new Date()): MonthPeriod {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: IST_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(reference);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const startUtc = new Date(Date.UTC(year, month - 1, 1, -5, -30, 0, 0));
  return { start: startUtc, end: reference, key: getMonthKey(reference) };
}

function getSeries(documentType: InvoiceDocumentType, ownerId?: string) {
  if (documentType === "OWNER_MONTHLY_COMMISSION_INVOICE") return "CCM";
  if (documentType === "CUSTOMER_STUDIO_TAX_INVOICE") {
    if (!ownerId) throw new Error("Studio invoice series requires an owner id");
    const suffix = ownerId.slice(-4).toUpperCase();
    return `ST${suffix}`;
  }
  if (documentType === "OWNER_MONTHLY_BILL_OF_SUPPLY") {
    if (!ownerId) throw new Error("Owner bill of supply series requires an owner id");
    const suffix = ownerId.slice(-4).toUpperCase();
    return `BOS${suffix}`;
  }
  return "CC";
}

function formatInvoiceNumber(params: {
  documentType: InvoiceDocumentType;
  series: string;
  financialYear: string;
  sequence: number;
}) {
  const [fyStartRaw, fyEndRaw] = params.financialYear.split("-");
  const fyShort = `${fyStartRaw.slice(-2)}${fyEndRaw}`;
  const seq = String(params.sequence).padStart(3, "0");
  const invoiceNumber = `${params.series}-${fyShort}-${seq}`;
  if (invoiceNumber.length > MAX_GST_INVOICE_NUMBER_LENGTH) {
    throw new Error(`Invoice number ${invoiceNumber} exceeds ${MAX_GST_INVOICE_NUMBER_LENGTH} characters`);
  }
  return invoiceNumber;
}

async function allocateInvoiceNumber(tx: TxClient, params: {
  documentType: InvoiceDocumentType;
  financialYear: string;
  ownerId?: string | null;
}) {
  const series = getSeries(params.documentType, params.ownerId || undefined);
  const scopeKey = [
    params.financialYear,
    series,
    params.ownerId || "GLOBAL",
  ].join(":");

  const sequenceRecord = await tx.invoiceSequence.upsert({
    where: { scopeKey },
    create: {
      scopeKey,
      financialYear: params.financialYear,
      series,
      ownerId: params.ownerId || null,
      nextNumber: 2,
    },
    update: {
      nextNumber: { increment: 1 },
    },
  });

  const sequence = sequenceRecord.nextNumber - 1;

  return {
    sequence,
    invoiceNumber: formatInvoiceNumber({
      documentType: params.documentType,
      series,
      financialYear: params.financialYear,
      sequence,
    }),
  };
}

async function createInvoiceWithIdempotency(params: {
  idempotencyKey: string;
  create: (tx: TxClient) => Promise<Invoice>;
}) {
  const existing = await prisma.invoice.findFirst({
    where: { idempotencyKey: params.idempotencyKey },
  });
  if (existing) return existing;

  for (let attempt = 1; attempt <= MAX_TRANSACTION_RETRIES; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        const already = await tx.invoice.findFirst({
          where: { idempotencyKey: params.idempotencyKey },
        });
        if (already) return already;

        await tx.invoiceIdempotencyLock.create({
          data: { idempotencyKey: params.idempotencyKey },
        });

        return await params.create(tx);
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const lockedInvoice = await prisma.invoice.findFirst({
          where: { idempotencyKey: params.idempotencyKey },
        });
        if (lockedInvoice) return lockedInvoice;
      }

      const message = error instanceof Error ? error.message : String(error);
      const isRetryable =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034"
        || /write conflict|deadlock|transaction failed/i.test(message);

      if (isRetryable && attempt < MAX_TRANSACTION_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 100));
        const retryExisting = await prisma.invoice.findFirst({
          where: { idempotencyKey: params.idempotencyKey },
        });
        if (retryExisting) return retryExisting;
        continue;
      }

      throw error;
    }
  }

  throw new Error("Invoice creation retry limit reached");
}

function getArkanetParty(): InvoiceParty {
  return {
    name: "ContCave",
    legalName: ARKANET_VENTURES_GST.companyName,
    address: ARKANET_VENTURES_GST.address,
    phone: "7800000930",
    email: "info@contcave.com",
    gstin: ARKANET_VENTURES_GST.gstin,
    label: "By Arkanet Ventures LLP",
  };
}

function actualLocationLabel(value: Prisma.JsonValue | null | undefined) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const obj = value as Record<string, unknown>;
  return String(obj.display_name || obj.label || obj.value || "").trim();
}

function placeOfSupply(value: Prisma.JsonValue | null | undefined, fallback: string | null | undefined, stateCode?: string | null) {
  const codeLabel = stateCode && GST_STATE_NAMES_BY_CODE[stateCode]
    ? `${GST_STATE_NAMES_BY_CODE[stateCode]} (${stateCode})`
    : null;
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    const city = String(obj.value || obj.label || "").trim();
    const state = String(obj.state || obj.region || "").trim();
    if (city && codeLabel) return `${city}, ${codeLabel}`;
    if (state && stateCode) return `${state} (${stateCode})`;
    if (state) return state;
  }
  if (fallback && codeLabel) return `${fallback}, ${codeLabel}`;
  return codeLabel || fallback || "India";
}

function getBillingPeriodLabel(start: Date, end: Date) {
  return `${formatDateIST(start)} - ${formatDateIST(end)}`;
}

function buildInvoiceAttachment(invoice: Invoice, pdfBuffer: Buffer): AttachmentInput {
  return {
    filename: `${invoice.invoiceNumber}.pdf`,
    content: pdfBuffer.toString("base64"),
  };
}

async function downloadInvoiceAttachment(invoice: Invoice): Promise<AttachmentInput | undefined> {
  if (!invoice.invoiceUrl) return undefined;
  if (process.env.E2E_DISABLE_R2_UPLOAD === "true") return undefined;
  try {
    const res = await fetch(invoice.invoiceUrl);
    if (!res.ok) throw new Error(`Invoice download failed (${res.status})`);
    const buffer = Buffer.from(await res.arrayBuffer());
    return {
      filename: `${invoice.invoiceNumber}.pdf`,
      content: buffer.toString("base64"),
    };
  } catch (error) {
    console.error("[InvoiceService] Invoice attachment download error", error);
    return undefined;
  }
}

async function uploadInvoicePdf(params: {
  invoice: Invoice;
  pdfBuffer: Buffer;
}) {
  if (process.env.E2E_DISABLE_R2_UPLOAD === "true") {
    return `https://assets.contcave.com/e2e/invoices/${params.invoice.id}/${params.invoice.invoiceNumber}.pdf`;
  }

  const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME;
  if (!bucket) throw new Error("Missing R2 bucket config");
  const publicBaseUrl = process.env.NEXT_PUBLIC_CLOUDFLARE_PUBLIC_URL;
  if (!publicBaseUrl) throw new Error("Missing Cloudflare public URL config");

  const key = [
    "users",
    params.invoice.userId,
    "billing",
    "invoices",
    params.invoice.financialYear || "legacy",
    params.invoice.documentType,
    params.invoice.id,
    `${params.invoice.invoiceNumber}.pdf`,
  ].join("/");

  await r2.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: params.pdfBuffer,
    ContentType: "application/pdf",
  }));

  return `${publicBaseUrl.replace(/\/$/, "")}/${key}`;
}

function getInvoiceEmailSubject(invoice: Invoice) {
  if (invoice.documentType === "OWNER_MONTHLY_COMMISSION_INVOICE") {
    return `ContCave monthly commission invoice ${invoice.invoiceNumber}`;
  }
  if (invoice.documentType === "OWNER_MONTHLY_BILL_OF_SUPPLY") {
    return `Studio bill of supply ${invoice.invoiceNumber}`;
  }
  return `Your ContCave invoice ${invoice.invoiceNumber}`;
}

function getInvoiceEmailHtml(invoice: Invoice) {
  const invoiceUrl = invoice.invoiceUrl ? `<p><a href="${invoice.invoiceUrl}" style="color:#111827;font-weight:600;">View invoice PDF</a></p>` : "";
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8" /><title>${invoice.invoiceNumber}</title></head>
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
              <p>Hi,</p>
              <p>Your ContCave invoice <strong>${invoice.invoiceNumber}</strong> is attached.</p>
              <p><strong>Total:</strong> ${formatInr(invoice.totalAmount)}</p>
              ${invoiceUrl}
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

function assertNoForbiddenInvoiceText(data: InvoicePDFData) {
  const text = JSON.stringify(data);
  if (/\b(TDS|194C|194H|Form 16A)\b/i.test(text)) {
    throw new Error("Generated invoice data contains forbidden TDS references");
  }
}

async function auditInvoice(invoice: Invoice, action: string, metadata: Prisma.InputJsonObject = {}) {
  await prisma.auditLog.create({
    data: {
      userId: invoice.userId,
      action,
      resource: "Invoice",
      resourceId: invoice.id,
      metadata,
    },
  }).catch((error) => {
    console.error("[InvoiceService] Audit log failed", error);
  });
}

async function renderAndStore(invoice: Invoice, pdfData: InvoicePDFData): Promise<{ invoice: Invoice; attachment: AttachmentInput }> {
  assertNoForbiddenInvoiceText(pdfData);
  const pdfBlob = await generateInvoicePDFBlob(pdfData);
  const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer());

  try {
    const invoiceUrl = await uploadInvoicePdf({ invoice, pdfBuffer });
    const stored = await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        invoiceUrl,
        generatedAt: invoice.generatedAt || new Date(),
        storedAt: new Date(),
        status: "EMAIL_PENDING",
      },
    });
    await auditInvoice(stored, "INVOICE_STORED", { invoiceNumber: stored.invoiceNumber });
    return { invoice: stored, attachment: buildInvoiceAttachment(stored, pdfBuffer) };
  } catch (error) {
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        status: "EMAIL_FAILED",
        emailError: error instanceof Error ? error.message : "Invoice PDF storage failed",
      },
    });
    throw error;
  }
}

export class InvoiceService {
  static async ensureCustomerInvoiceForTransaction(transactionIdInput: string): Promise<MonthlyInvoiceResult> {
    const transactionId = assertObjectId(transactionIdInput, "transactionId");
    const existing = await prisma.invoice.findFirst({
      where: {
        transactionId,
        documentType: {
          in: ["CUSTOMER_STUDIO_TAX_INVOICE", "CUSTOMER_ARKANET_TAX_INVOICE"],
        },
      },
      orderBy: { createdAt: "desc" },
    });
    if (existing?.invoiceUrl && existing.storedAt) {
      return { invoice: existing, attachment: await downloadInvoiceAttachment(existing) };
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        user: { include: { billingDetails: { where: { isDefault: true }, take: 1 } } },
        reservation: {
          include: {
            billingDetail: true,
            listing: {
              include: {
                user: { include: { paymentDetails: true } },
              },
            },
          },
        },
      },
    });

    if (!transaction) throw new Error("Transaction not found");
    if (!transaction.reservation) throw new Error("Reservation not found");
    if (transaction.status !== "SUCCESS") throw new Error("Cannot invoice an unsuccessful transaction");

    const reservation = transaction.reservation;
    const listing = reservation.listing;
    const owner = listing.user;
    const billing = reservation.billingDetail || transaction.user.billingDetails[0] || null;

    let studioPayment: ReturnType<typeof decryptPaymentDetailsInternal> | null = null;
    try {
      studioPayment = owner.paymentDetails
        ? decryptPaymentDetailsInternal(owner.paymentDetails as PaymentDetails)
        : null;
    } catch (error) {
      console.error("[InvoiceService] Owner payment details decrypt failed", error);
    }

    const providedStudioGstin = normalizeGstin(studioPayment?.gstin);
    const studioHasGst = Boolean(studioPayment?.companyName?.trim() && providedStudioGstin);
    const studioGstin = studioHasGst ? assertValidGstin(providedStudioGstin, "Studio") : null;
    const supplierGstin = studioGstin || assertValidGstin(ARKANET_VENTURES_GST.gstin, "ContCave");
    const propertyStateCode = assertPropertyStateCode(listing.propertyStateCode);
    const documentType: InvoiceDocumentType = studioHasGst
      ? "CUSTOMER_STUDIO_TAX_INVOICE"
      : "CUSTOMER_ARKANET_TAX_INVOICE";
    const financialYear = getFinancialYear(new Date());
    const idempotencyKey = `${documentType}:${transaction.id}`;
    const totalAmount = roundMoney(transaction.amount || reservation.totalPrice);
    const amount = roundMoney(totalAmount / (1 + GST_RATE));
    const taxBreakup = calculateTaxBreakup(amount, supplierGstin, propertyStateCode);
    const gstAmount = taxBreakup.totalTax;
    const issuedAt = new Date();
    const location = actualLocationLabel(listing.actualLocation);

    const billedBy: InvoiceParty = studioHasGst
      ? {
        name: studioPayment?.companyName || owner.name || "Studio Partner",
        legalName: studioPayment?.companyName || owner.name || "Studio Partner",
        address: location || listing.locationValue,
        phone: owner.phone,
        email: owner.email,
        gstin: studioGstin,
        label: "Generated via ContCave",
      }
      : getArkanetParty();

    const customerLineItem = applyTaxToLineItem({
      description: "Studio Booking",
      subText: `${listing.title} booked via ContCave`,
      sac: DEFAULT_SAC_CODE,
      quantity: "1",
      rate: amount,
      taxableValue: amount,
    }, taxBreakup);

    const billedTo: InvoiceParty = billing
      ? {
        name: billing.companyName,
        legalName: billing.companyName,
        address: billing.billingAddress,
        gstin: billing.gstin,
        email: transaction.user.email,
      }
      : {
        name: transaction.user.name || transaction.user.email || "Customer",
        email: transaction.user.email,
      };

    const pdfData: InvoicePDFData = {
      documentType,
      invoiceNumber: "",
      invoiceDate: issuedAt,
      placeOfSupply: placeOfSupply(listing.actualLocation, listing.locationValue, propertyStateCode),
      paymentMode: "Collected via ContCave",
      bookingId: reservation.bookingId,
      studioName: listing.title,
      bookingDate: reservation.startDate,
      durationLabel: `${reservation.startTime} - ${reservation.endTime}`,
      billedBy,
      billedTo,
      lineItems: [customerLineItem],
      amount,
      gstAmount,
      taxBreakup,
      totalAmount,
      notes: studioHasGst
        ? [
          `This invoice is issued by ${billedBy.legalName || billedBy.name}, generated through the ContCave platform on the studio's behalf.`,
          "Place of supply is based on the studio location for services related to immovable property.",
          "Input tax credit is subject to applicable GST law and recipient eligibility.",
          "Payment is collected by ContCave and settled to the studio as per platform terms.",
        ]
        : [
          "This is a computer-generated invoice and does not require a physical signature.",
          "Place of supply is based on the studio location for services related to immovable property.",
          "Input tax credit is subject to applicable GST law and recipient eligibility.",
          "Subject to Delhi jurisdiction.",
        ],
    };

    const invoice = await createInvoiceWithIdempotency({
      idempotencyKey,
      create: async (tx) => {
      const allocated = await allocateInvoiceNumber(tx, {
        documentType,
        financialYear,
        ownerId: studioHasGst ? owner.id : null,
      });

      return await tx.invoice.create({
        data: {
          invoiceNumber: allocated.invoiceNumber,
          userId: transaction.userId,
          reservationId: reservation.id,
          transactionId: transaction.id,
          billingId: billing?.id,
          amount,
          gstAmount,
          totalAmount,
          taxableValue: taxBreakup.taxableValue,
          cgstRate: taxBreakup.cgstRate,
          cgstAmount: taxBreakup.cgstAmount,
          sgstRate: taxBreakup.sgstRate,
          sgstAmount: taxBreakup.sgstAmount,
          igstRate: taxBreakup.igstRate,
          igstAmount: taxBreakup.igstAmount,
          invoiceUrl: "",
          documentType,
          issuerType: studioHasGst ? "STUDIO" : "ARKANET",
          recipientType: "CUSTOMER",
          financialYear,
          issuedAt,
          generatedAt: new Date(),
          sequence: allocated.sequence,
          idempotencyKey,
          status: "GENERATED",
          lineItems: pdfData.lineItems as unknown as Prisma.InputJsonValue,
          totals: { amount, gstAmount, totalAmount, taxBreakup } as unknown as Prisma.InputJsonObject,
        },
      });
      },
    });

    pdfData.invoiceNumber = invoice.invoiceNumber;
    await auditInvoice(invoice, "INVOICE_GENERATED", { invoiceNumber: invoice.invoiceNumber, documentType });
    return await renderAndStore(invoice, pdfData);
  }

  static async ensureMonthlyOwnerInvoice(params: {
    ownerId: string;
    periodStart: Date;
    periodEnd: Date;
    documentType?: Extract<InvoiceDocumentType, "OWNER_MONTHLY_COMMISSION_INVOICE" | "OWNER_MONTHLY_BILL_OF_SUPPLY">;
  }): Promise<MonthlyInvoiceResult | null> {
    const ownerId = assertObjectId(params.ownerId, "ownerId");
    const owner = await prisma.user.findUnique({
      where: { id: ownerId },
      include: { paymentDetails: true },
    });
    if (!owner) throw new Error("Owner not found");

    const txns = await prisma.transaction.findMany({
      where: {
        status: "SUCCESS",
        reservationId: { not: null },
        reservation: {
          is: {
            markedForDeletion: false,
            isApproved: 1,
            startDate: { gte: params.periodStart, lte: params.periodEnd },
            listing: { userId: ownerId },
          },
        },
      },
      include: {
        user: true,
        reservation: {
          include: {
            listing: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    if (txns.length === 0) return null;

    const hasGstTransactions = txns.some((txn) => txn.gstOwnedBy === "STUDIO");
    const documentType: InvoiceDocumentType =
      params.documentType || (hasGstTransactions ? "OWNER_MONTHLY_COMMISSION_INVOICE" : "OWNER_MONTHLY_BILL_OF_SUPPLY");
    const relevantTxns = txns.filter((txn) =>
      documentType === "OWNER_MONTHLY_COMMISSION_INVOICE"
        ? txn.gstOwnedBy === "STUDIO"
        : txn.gstOwnedBy !== "STUDIO"
    );

    if (relevantTxns.length === 0) return null;

    const periodKey = `${params.periodStart.toISOString()}:${params.periodEnd.toISOString()}`;
    const idempotencyKey = `${documentType}:${ownerId}:${periodKey}`;
    const existing = await prisma.invoice.findFirst({ where: { idempotencyKey } });
    if (existing?.invoiceUrl && existing.storedAt) {
      return { invoice: existing, attachment: await downloadInvoiceAttachment(existing) };
    }

    let studioPayment: ReturnType<typeof decryptPaymentDetailsInternal> | null = null;
    try {
      studioPayment = owner.paymentDetails
        ? decryptPaymentDetailsInternal(owner.paymentDetails as PaymentDetails)
        : null;
    } catch (error) {
      console.error("[InvoiceService] Monthly owner payment details decrypt failed", error);
    }

    const issuedAt = params.periodEnd;
    const financialYear = getFinancialYear(issuedAt);
    const billingPeriod = getBillingPeriodLabel(params.periodStart, params.periodEnd);
    const ownerGstin = normalizeGstin(studioPayment?.gstin);
    const ownerGstinForCommission = documentType === "OWNER_MONTHLY_COMMISSION_INVOICE"
      ? assertValidGstin(ownerGstin, "Studio owner")
      : ownerGstin || null;
    const totalBookingBase = roundMoney(relevantTxns.reduce((sum, txn) => {
      const base = txn.baseAmountBeforeGst || roundMoney(txn.amount / (1 + GST_RATE));
      return sum + base;
    }, 0));
    const commissionAmount = roundMoney(totalBookingBase * (PLATFORM_COMMISSION_PERCENT / 100));
    const billOfSupplyAmount = roundMoney(relevantTxns.reduce((sum, txn) => sum + (txn.payoutAmountToOwner || 0), 0));

    const amount = documentType === "OWNER_MONTHLY_COMMISSION_INVOICE" ? commissionAmount : billOfSupplyAmount;
    const taxBreakup = documentType === "OWNER_MONTHLY_COMMISSION_INVOICE"
      ? calculateTaxBreakup(commissionAmount, ARKANET_VENTURES_GST.gstin, ownerGstinForCommission!.slice(0, 2))
      : zeroTaxBreakup(billOfSupplyAmount);
    const gstAmount = documentType === "OWNER_MONTHLY_COMMISSION_INVOICE" ? taxBreakup.totalTax : 0;
    const totalAmount = roundMoney(amount + gstAmount);

    const ownerParty: InvoiceParty = {
      name: studioPayment?.companyName || owner.name || "Studio Owner",
      legalName: studioPayment?.companyName || owner.name || "Studio Owner",
      email: owner.email,
      phone: owner.phone,
      gstin: ownerGstinForCommission,
      label: documentType === "OWNER_MONTHLY_BILL_OF_SUPPLY" ? "Non-GST Studio Partner" : undefined,
    };

    const lineItems: InvoiceLineItem[] = documentType === "OWNER_MONTHLY_COMMISSION_INVOICE"
      ? relevantTxns.map((txn) => {
        const base = roundMoney(txn.baseAmountBeforeGst || txn.amount / (1 + GST_RATE));
        return applyTaxRatesToLineItem({
          description: txn.bookingId || txn.reservation?.bookingId || "Booking",
          subText: `${txn.user.name || "Customer"} - ${txn.reservation?.listing.title || "Studio"}`,
          sac: DEFAULT_SAC_CODE,
          quantity: "1",
          rate: roundMoney(base * (PLATFORM_COMMISSION_PERCENT / 100)),
          taxableValue: roundMoney(base * (PLATFORM_COMMISSION_PERCENT / 100)),
        }, taxBreakup);
      })
      : relevantTxns.map((txn) => applyTaxRatesToLineItem({
        description: txn.bookingId || txn.reservation?.bookingId || "Studio service",
        subText: `${txn.user.name || "Customer"} - ${txn.reservation?.listing.title || "Studio"}`,
        quantity: "1",
        rate: roundMoney(txn.payoutAmountToOwner || 0),
        taxableValue: roundMoney(txn.payoutAmountToOwner || 0),
      }, taxBreakup));

    const pdfData: InvoicePDFData = {
      documentType,
      invoiceNumber: "",
      invoiceDate: issuedAt,
      placeOfSupply: documentType === "OWNER_MONTHLY_COMMISSION_INVOICE"
        ? `${GST_STATE_NAMES_BY_CODE[ownerGstinForCommission!.slice(0, 2)]} (${ownerGstinForCommission!.slice(0, 2)})`
        : owner.location || "India",
      billingPeriod,
      billedBy: documentType === "OWNER_MONTHLY_COMMISSION_INVOICE" ? getArkanetParty() : ownerParty,
      billedTo: documentType === "OWNER_MONTHLY_COMMISSION_INVOICE" ? ownerParty : getArkanetParty(),
      lineItems,
      amount,
      gstAmount,
      taxBreakup,
      totalAmount,
      notes: documentType === "OWNER_MONTHLY_COMMISSION_INVOICE"
        ? [
          "Consolidated invoice for platform commission on bookings facilitated during the billing period.",
          `Commission is ${PLATFORM_COMMISSION_PERCENT}% of base booking value. GST applies on the commission amount.`,
          "This month-end invoice formalises the platform commission for the billing period.",
          "Computer-generated invoice. Subject to Delhi jurisdiction.",
        ]
        : [
          "Bill of Supply for non-GST studio services facilitated through ContCave during the billing period.",
          "No GST is charged on this document because the studio partner is not GST-registered.",
          "Issued by the studio partner to Arkanet Ventures LLP for the billing period.",
          "Computer-generated document. Subject to Delhi jurisdiction.",
        ],
    };

    const invoice = await createInvoiceWithIdempotency({
      idempotencyKey,
      create: async (tx) => {
      const allocated = await allocateInvoiceNumber(tx, {
        documentType,
        financialYear,
        ownerId: documentType === "OWNER_MONTHLY_COMMISSION_INVOICE" ? null : ownerId,
      });

      return await tx.invoice.create({
        data: {
          invoiceNumber: allocated.invoiceNumber,
          userId: ownerId,
          amount,
          gstAmount,
          totalAmount,
          taxableValue: taxBreakup.taxableValue,
          cgstRate: taxBreakup.cgstRate,
          cgstAmount: taxBreakup.cgstAmount,
          sgstRate: taxBreakup.sgstRate,
          sgstAmount: taxBreakup.sgstAmount,
          igstRate: taxBreakup.igstRate,
          igstAmount: taxBreakup.igstAmount,
          invoiceUrl: "",
          documentType,
          issuerType: documentType === "OWNER_MONTHLY_COMMISSION_INVOICE" ? "ARKANET" : "STUDIO",
          recipientType: documentType === "OWNER_MONTHLY_COMMISSION_INVOICE" ? "OWNER" : "ARKANET",
          financialYear,
          periodStart: params.periodStart,
          periodEnd: params.periodEnd,
          issuedAt,
          generatedAt: new Date(),
          sequence: allocated.sequence,
          idempotencyKey,
          status: "GENERATED",
          lineItems: lineItems as unknown as Prisma.InputJsonValue,
          totals: { amount, gstAmount, totalAmount, bookingCount: relevantTxns.length, taxBreakup } as unknown as Prisma.InputJsonObject,
        },
      });
      },
    });

    pdfData.invoiceNumber = invoice.invoiceNumber;
    await auditInvoice(invoice, "INVOICE_GENERATED", { invoiceNumber: invoice.invoiceNumber, documentType });
    const stored = await renderAndStore(invoice, pdfData);

    if (!owner.email) {
      const blocked = await prisma.invoice.update({
        where: { id: stored.invoice.id },
        data: { status: "DELIVERY_BLOCKED", emailError: "Owner email is missing" },
      });
      return { invoice: blocked, attachment: stored.attachment };
    }

    return stored;
  }

  static async sendInvoiceEmail(invoiceIdInput: string): Promise<Invoice> {
    const invoiceId = assertObjectId(invoiceIdInput, "invoiceId");
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { user: true },
    });

    if (!invoice) throw new Error("Invoice not found");
    if (invoice.emailSentAt) return invoice;
    if (!invoice.invoiceUrl) throw new Error("Invoice PDF is not stored");
    if (!invoice.user.email) {
      return await prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: "DELIVERY_BLOCKED", emailError: "Recipient email is missing" },
      });
    }
    const claim = await prisma.invoice.updateMany({
      where: {
        id: invoice.id,
        emailSentAt: null,
        status: { not: "RETRYING" },
      },
      data: {
        status: invoice.retryCount > 0 ? "RETRYING" : "EMAIL_PENDING",
        emailError: null,
      },
    });
    if (claim.count !== 1) {
      const latest = await prisma.invoice.findUnique({ where: { id: invoice.id } });
      if (latest?.emailSentAt) return latest;
      throw new Error("Invoice email delivery is already in progress");
    }

    if (process.env.E2E_DISABLE_EMAIL_SEND === "true") {
      const sent = await prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: "EMAIL_SENT", emailSentAt: new Date(), emailError: null },
      });
      await auditInvoice(sent, "INVOICE_EMAIL_SENT", { invoiceNumber: sent.invoiceNumber, skipped: true });
      return sent;
    }

    try {
      const attachment = await downloadInvoiceAttachment(invoice);
      if (!attachment) throw new Error("Invoice attachment unavailable");
      if (!process.env.MAILERSEND_API_KEY) {
        throw new Error("MailerSend API key is missing");
      }

      await sendEmail({
        toEmail: invoice.user.email,
        toName: invoice.user.name || "",
        subject: getInvoiceEmailSubject(invoice),
        html: getInvoiceEmailHtml(invoice),
        attachments: [attachment],
      });

      const sent = await prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: "EMAIL_SENT", emailSentAt: new Date(), emailError: null },
      });
      await auditInvoice(sent, "INVOICE_EMAIL_SENT", { invoiceNumber: sent.invoiceNumber });
      return sent;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invoice email failed";
      const failed = await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          status: "EMAIL_FAILED",
          emailError: message.slice(0, 500),
          retryCount: { increment: 1 },
        },
      });
      await auditInvoice(failed, "INVOICE_EMAIL_FAILED", { invoiceNumber: failed.invoiceNumber, error: message.slice(0, 300) });
      throw error;
    }
  }

  static async retryFailedInvoiceEmail(invoiceId: string): Promise<Invoice> {
    const invoice = await prisma.invoice.findUnique({ where: { id: assertObjectId(invoiceId, "invoiceId") } });
    if (!invoice) throw new Error("Invoice not found");
    if (invoice.retryCount >= MAX_RETRY_COUNT) throw new Error("Invoice email retry limit reached");
    return await this.sendInvoiceEmail(invoice.id);
  }

  static async processMonthlyOwnerInvoices(params: {
    periodStart: Date;
    periodEnd: Date;
    sendEmails?: boolean;
  }) {
    const owners = await prisma.user.findMany({
      where: {
        role: "OWNER",
        listings: {
          some: {
            reservations: {
              some: {
                markedForDeletion: false,
                isApproved: 1,
                startDate: { gte: params.periodStart, lte: params.periodEnd },
                Transaction: { some: { status: "SUCCESS" } },
              },
            },
          },
        },
      },
      select: { id: true },
    });

    const results: Array<{ ownerId: string; invoiceId?: string; documentType?: string; status: string; error?: string }> = [];

    for (const owner of owners) {
      for (const documentType of ["OWNER_MONTHLY_COMMISSION_INVOICE", "OWNER_MONTHLY_BILL_OF_SUPPLY"] as const) {
        try {
          const result = await this.ensureMonthlyOwnerInvoice({
            ownerId: owner.id,
            periodStart: params.periodStart,
            periodEnd: params.periodEnd,
            documentType,
          });
          if (!result) continue;
          let invoice = result.invoice;
          if (params.sendEmails !== false && invoice.status !== "DELIVERY_BLOCKED" && !invoice.emailSentAt) {
            invoice = await this.sendInvoiceEmail(invoice.id);
          }
          results.push({ ownerId: owner.id, invoiceId: invoice.id, documentType, status: invoice.status });
        } catch (error) {
          results.push({
            ownerId: owner.id,
            documentType,
            status: "FAILED",
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    return results;
  }

  static async retryPendingInvoiceEmails(limit = 100) {
    const invoices = await prisma.invoice.findMany({
      where: {
        emailSentAt: null,
        invoiceUrl: { not: "" },
        status: { in: ["EMAIL_FAILED", "EMAIL_PENDING", "RETRYING"] },
        retryCount: { lt: MAX_RETRY_COUNT },
      },
      take: limit,
      orderBy: { updatedAt: "asc" },
    });

    const results: Array<{ invoiceId: string; ok: boolean; error?: string }> = [];
    for (const invoice of invoices) {
      try {
        await this.sendInvoiceEmail(invoice.id);
        results.push({ invoiceId: invoice.id, ok: true });
      } catch (error) {
        results.push({
          invoiceId: invoice.id,
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    return results;
  }
}
