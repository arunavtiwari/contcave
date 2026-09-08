import { AdditionalChargeType, Prisma } from "@prisma/client";
import crypto from "crypto";
import { addDays } from "date-fns";

import { checkSetConflicts, parseTimeToMinutes } from "@/lib/availability";
import { cfCreateOrder } from "@/lib/cashfree/cashfree";
import { scheduleQstashJob } from "@/lib/cron/qstash";
import { UserFacingError } from "@/lib/errors";
import { InvoiceService } from "@/lib/invoice/service";
import { decryptPaymentDetailsInternal } from "@/lib/payment-details";
import { calculatePayoutDetails, hasValidGST } from "@/lib/payout/utils";
import prisma from "@/lib/prismadb";
import { canCreatePostBookingCharge } from "@/lib/reservation/status";
import { parseReservationEndTimeForDate } from "@/lib/reservation/time";
import { asEndOfDayMinutes } from "@/lib/scheduling";
import { getValidatedBaseUrl } from "@/lib/utils";
import { WhatsappService } from "@/lib/whatsapp/service";

const TOKEN_BYTES = 32;
const EXTENSION_EXPIRY_MINUTES = 30;
const ADDITIONAL_CHARGE_EXPIRY_MS = 24 * 60 * 60 * 1000;
const MAX_PAYMENT_AMOUNT = 10_000_000;
const LISTING_WIDE_SLOT_ID = "__LISTING__";
const MINUTES_PER_DAY = 24 * 60;
const TRANSIENT_DB_RETRY_ATTEMPTS = 3;
const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;
const PAYMENT_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

type ChargeItem = {
  name: string;
  qty: number;
  unitPrice: number;
};

function tokenHash(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function createPaymentToken() {
  const token = crypto.randomBytes(TOKEN_BYTES).toString("base64url");
  return { token, hash: tokenHash(token) };
}

function normalizePhone(phone?: string | null) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  const stripped = digits.startsWith("91") && digits.length === 12 ? digits.slice(2) : digits;
  return stripped.length === 10 ? stripped : null;
}

function formatMinutesAsLabel(minutes: number) {
  const normalized = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60);
  let hour = Math.floor(normalized / 60);
  const minute = normalized % 60;
  const period = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${hour}:${String(minute).padStart(2, "0")} ${period}`;
}

function configuredClosingMinutes(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return MINUTES_PER_DAY;
  const hours = value as { start?: unknown; end?: unknown };
  const start = typeof hours.start === "string" ? parseTimeToMinutes(hours.start) : Number.NaN;
  const rawEnd = typeof hours.end === "string" ? parseTimeToMinutes(hours.end) : Number.NaN;
  if (start === 0 && rawEnd === 0) return MINUTES_PER_DAY;
  const end = asEndOfDayMinutes(rawEnd);
  return Number.isFinite(start) && Number.isFinite(end) && end > start ? end : 0;
}

async function extensionClosingMinutes(listingId: string, date: Date, operationalHours: unknown) {
  const day = new Date(date);
  day.setUTCHours(0, 0, 0, 0);
  const override = await prisma.dayStatus.findUnique({
    where: { listingId_date: { listingId, date: day } },
    select: { listingActive: true, startTime: true, endTime: true },
  });
  if (override && !override.listingActive) return 0;
  return configuredClosingMinutes(override
    ? { start: override.startTime, end: override.endTime }
    : operationalHours);
}

function isTransientDatabaseError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034"
    || /write conflict|deadlock|transaction failed/i.test(message);
}

async function retryTransientDatabaseOperation<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 1; attempt <= TRANSIENT_DB_RETRY_ATTEMPTS; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!isTransientDatabaseError(error) || attempt === TRANSIENT_DB_RETRY_ATTEMPTS) throw error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 100));
    }
  }
  throw new Error("Transient database retry limit reached");
}

function endTimeForDate(date: Date, label: string) {
  const parsed = parseReservationEndTimeForDate(date, label);
  if (!parsed) throw new UserFacingError("Reservation end time is invalid");
  return parsed;
}

function buildReservationSlotRows(params: {
  listingId: string;
  reservationId: string;
  startDate: Date;
  startTime: string;
  endTime: string;
  setIds: string[];
}) {
  const start = parseTimeToMinutes(params.startTime);
  const end = asEndOfDayMinutes(parseTimeToMinutes(params.endTime));
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    throw new UserFacingError("Extensions must end on the same booking date");
  }

  const dateKey = params.startDate.toISOString().slice(0, 10);
  const slotSetIds = params.setIds.length > 0 ? Array.from(new Set(params.setIds)) : [LISTING_WIDE_SLOT_ID];
  const rows: Prisma.ReservationSlotCreateManyInput[] = [];

  for (let cursor = start; cursor < end; cursor += 30) {
    const hour = String(Math.floor(cursor / 60)).padStart(2, "0");
    const minute = String(cursor % 60).padStart(2, "0");
    const slotKey = `${hour}:${minute}`;

    for (const setId of slotSetIds) {
      rows.push({
        listingId: params.listingId,
        reservationId: params.reservationId,
        dateKey,
        slotKey,
        setId,
      });
    }
  }

  return rows;
}

function getOwnerPayoutData(ownerPaymentDetails: unknown, amount: number, payoutDueAt?: Date): Prisma.TransactionUncheckedUpdateInput {
  try {
    if (!ownerPaymentDetails) return {};
    const paymentDetails = decryptPaymentDetailsInternal(ownerPaymentDetails as Parameters<typeof decryptPaymentDetailsInternal>[0]);
    const payoutDetails = calculatePayoutDetails(amount, hasValidGST(paymentDetails));
    return {
      payoutAmountToOwner: payoutDetails.payoutToStudio,
      payoutPercentToOwner: payoutDetails.payoutPercentOfTotal,
      gstOwnedBy: payoutDetails.gstOwnedBy,
      baseAmountBeforeGst: payoutDetails.baseAmount,
      ...(payoutDueAt ? { payoutDueAt } : {}),
    };
  } catch (error) {
    console.error("[PostBookingService] Payout setup failed:", error);
    return {};
  }
}

async function writeSystemMessage(reservationId: string, text: string, tx?: Prisma.TransactionClient) {
  const db = tx || prisma;
  await db.reservationChatMessage.create({
    data: { reservationId, kind: "SYSTEM", text },
  }).catch((error) => {
    console.error("[PostBookingService] Failed to write system message:", error);
  });
}

function sanitizeItems(items: unknown): ChargeItem[] {
  if (!Array.isArray(items) || items.length === 0 || items.length > 20) {
    throw new UserFacingError("Provide between 1 and 20 line items");
  }
  const normalized = items.map((item) => {
    const raw = item as Partial<ChargeItem>;
    const name = String(raw.name || "").trim();
    const qty = Number(raw.qty);
    const unitPrice = Number(raw.unitPrice);
    if (
      !name ||
      name.length > 80 ||
      !Number.isInteger(qty) ||
      qty < 1 ||
      qty > 100 ||
      !Number.isInteger(unitPrice) ||
      unitPrice < 1 ||
      unitPrice > MAX_PAYMENT_AMOUNT
    ) return null;
    return { name, qty, unitPrice };
  }).filter((item): item is ChargeItem => Boolean(item));

  if (normalized.length !== items.length) throw new UserFacingError("One or more line items are invalid");
  const total = normalized.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
  if (!Number.isSafeInteger(total) || total > MAX_PAYMENT_AMOUNT) {
    throw new UserFacingError("Total charge exceeds the maximum payment amount");
  }
  return normalized;
}

function isUniqueConstraintError(error: unknown) {
  return Boolean(
    error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

export class PostBookingService {
  static async getExtensionAvailability(reservationId: string, ownerId: string, allowAdmin = false) {
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { listing: true },
    });
    if (!reservation) throw new UserFacingError("Reservation not found", 404);
    if (reservation.listing.userId !== ownerId && !allowAdmin) throw new UserFacingError("Only the host can check extension availability", 403);
    if (reservation.status !== "CHECKED_IN") {
      return { maxDurationMinutes: 0, maxEndTime: reservation.endTime, reason: "Session is not checked in" };
    }

    let maxDurationMinutes = 0;
    let maxEndTime = reservation.endTime;
    const oldEndMinutes = asEndOfDayMinutes(parseTimeToMinutes(reservation.endTime));
    if (!Number.isFinite(oldEndMinutes)) {
      return { maxDurationMinutes: 0, maxEndTime, reason: "Reservation end time is invalid" };
    }

    const closingMinutes = await extensionClosingMinutes(
      reservation.listingId,
      reservation.startDate,
      reservation.listing.operationalHours,
    );
    const maxDuration = Math.min(12 * 60, Math.max(0, closingMinutes - oldEndMinutes));
    for (let duration = 30; duration <= maxDuration; duration += 30) {
      const requestedEndTime = formatMinutesAsLabel(oldEndMinutes + duration);
      const conflict = await checkSetConflicts({
        listingId: reservation.listingId,
        date: reservation.startDate,
        startTime: reservation.endTime,
        endTime: requestedEndTime,
        setIds: reservation.setIds,
        excludeReservationId: reservation.id,
      });

      if (conflict.hasConflict) {
        return {
          maxDurationMinutes,
          maxEndTime,
          reason: conflict.conflictDetails || "Next slot is unavailable",
        };
      }

      maxDurationMinutes = duration;
      maxEndTime = requestedEndTime;
    }

    return { maxDurationMinutes, maxEndTime, reason: null };
  }

  static async createExtensionRequest(params: {
    reservationId: string;
    ownerId: string;
    allowAdmin?: boolean;
    durationMinutes: number;
    extraAmount: number;
  }) {
    const durationMinutes = Math.round(Number(params.durationMinutes));
    const extraAmount = Math.round(Number(params.extraAmount));
    if (durationMinutes < 30 || durationMinutes % 30 !== 0) throw new UserFacingError("Extension duration must use 30-minute increments");
    if (extraAmount <= 0) throw new UserFacingError("Extension price must be greater than zero");
    if (!Number.isSafeInteger(extraAmount) || extraAmount > MAX_PAYMENT_AMOUNT) {
      throw new UserFacingError("Extension price exceeds the maximum payment amount");
    }

    const reservation = await prisma.reservation.findUnique({
      where: { id: params.reservationId },
      include: {
        user: true,
        listing: { include: { user: { include: { paymentDetails: true } } } },
      },
    });
    if (!reservation) throw new UserFacingError("Reservation not found", 404);
    if (reservation.listing.userId !== params.ownerId && !params.allowAdmin) throw new UserFacingError("Only the host can extend this session", 403);
    if (reservation.status !== "CHECKED_IN") throw new UserFacingError("Only checked-in sessions can be extended");
    const pendingExtension = await prisma.extensionRequest.findFirst({
      where: { reservationId: reservation.id, status: "PENDING_PAYMENT", expiresAt: { gt: new Date() } },
      select: { id: true },
    });
    if (pendingExtension) throw new UserFacingError("A pending extension payment already exists for this session", 409);

    const oldEndMinutes = asEndOfDayMinutes(parseTimeToMinutes(reservation.endTime));
    if (!Number.isFinite(oldEndMinutes)) throw new UserFacingError("Reservation end time is invalid");
    if (oldEndMinutes + durationMinutes > MINUTES_PER_DAY) {
      throw new UserFacingError("Extensions cannot continue past midnight on the booking date");
    }
    const closingMinutes = await extensionClosingMinutes(
      reservation.listingId,
      reservation.startDate,
      reservation.listing.operationalHours,
    );
    if (oldEndMinutes + durationMinutes > closingMinutes) {
      throw new UserFacingError("Extensions cannot continue past the studio's operating hours");
    }
    const requestedEndTime = formatMinutesAsLabel(oldEndMinutes + durationMinutes);

    const conflict = await checkSetConflicts({
      listingId: reservation.listingId,
      date: reservation.startDate,
      startTime: reservation.endTime,
      endTime: requestedEndTime,
      setIds: reservation.setIds,
      excludeReservationId: reservation.id,
    });
    if (conflict.hasConflict) {
      throw new UserFacingError(conflict.conflictDetails || "The extension overlaps another booking or block", 409);
    }

    const customerPhone = normalizePhone(reservation.user.phone);
    if (!customerPhone) throw new UserFacingError("Customer must have a valid phone number before creating a payment link");

    const { token, hash } = createPaymentToken();
    const expiresAt = new Date(Date.now() + EXTENSION_EXPIRY_MINUTES * 60 * 1000);
    const appUrl = getValidatedBaseUrl();
    const tId = `ext_${crypto.randomBytes(10).toString("hex")}`;

    const created = await prisma.$transaction(async (tx) => {
      // Touch the reservation so concurrent extension attempts contend on the same document.
      await tx.reservation.update({
        where: { id: reservation.id },
        data: { extensionNudgeSentAt: reservation.extensionNudgeSentAt },
      });
      const concurrentExtension = await tx.extensionRequest.findFirst({
        where: {
          reservationId: reservation.id,
          status: "PENDING_PAYMENT",
          expiresAt: { gt: new Date() },
        },
        select: { id: true },
      });
      if (concurrentExtension) {
        throw new UserFacingError("A pending extension payment already exists for this session", 409);
      }

      const extension = await tx.extensionRequest.create({
        data: {
          reservationId: reservation.id,
          durationMinutes,
          oldEndTime: reservation.endTime,
          requestedEndTime,
          extraAmount,
          listingRateAtTime: reservation.listing.price || null,
          paymentTokenHash: hash,
          expiresAt,
        },
      });

      const txn = await tx.transaction.create({
        data: {
          userId: reservation.userId,
          reservationId: reservation.id,
          listingId: reservation.listingId,
          bookingId: reservation.bookingId,
          amount: extraAmount,
          status: "PENDING",
          purpose: "EXTENSION",
          extensionRequestId: extension.id,
          description: "Session extension",
          paymentMethod: "Cashfree",
          cfTxnRef: tId,
          metadata: {
            reservationId: reservation.id,
            extensionRequestId: extension.id,
            durationMinutes,
            oldEndTime: reservation.endTime,
            requestedEndTime,
          },
        },
      });

      return { extension, txn };
    });

    let order;
    try {
      order = await cfCreateOrder({
        transaction_id: tId,
        order_amount: extraAmount,
        customer_id: reservation.userId,
        return_url: `${appUrl}/api/payments/cashfree/return?tid={transaction_id}`,
        notify_url: `${appUrl}/api/payments/cashfree/webhook`,
        customer_name: reservation.user.name || "Customer",
        customer_email: reservation.user.email || undefined,
        customer_phone: customerPhone,
        expires_at: expiresAt,
      });
    } catch (error) {
      await prisma.$transaction(async (tx) => {
        await tx.extensionRequest.update({ where: { id: created.extension.id }, data: { status: "CANCELLED", cancelledAt: new Date(), failureReason: "Payment provider order creation failed" } });
        await tx.transaction.update({ where: { id: created.txn.id }, data: { status: "FAILED", description: "Payment provider order creation failed" } });
        await writeSystemMessage(reservation.id, "The extension payment link could not be created. Please try again.", tx);
      });
      throw error;
    }

    try {
      await prisma.$transaction(async (tx) => {
        await tx.extensionRequest.update({
          where: { id: created.extension.id },
          data: { cfOrderId: order.order_id },
        });
        await tx.transaction.update({
          where: { id: created.txn.id },
          data: { cfOrderId: order.order_id, cfPaymentSessionId: order.payment_session_id },
        });
        await writeSystemMessage(reservation.id, `Host requested a ${durationMinutes}-minute extension for Rs. ${extraAmount}.`, tx);
      });
    } catch (error) {
      await prisma.$transaction(async (tx) => {
        await tx.extensionRequest.updateMany({
          where: { id: created.extension.id, status: "PENDING_PAYMENT" },
          data: { status: "CANCELLED", cancelledAt: new Date(), failureReason: "Payment session could not be saved" },
        });
        await tx.transaction.updateMany({
          where: { id: created.txn.id, status: "PENDING" },
          data: { status: "FAILED", description: "Payment session could not be saved" },
        });
      }).catch((cleanupError) => {
        console.error("[PostBookingService] Extension persistence cleanup failed:", cleanupError);
      });
      throw error;
    }

    await scheduleQstashJob({ job: "extension-expiry", extensionId: created.extension.id }, expiresAt);

    await WhatsappService.sendExtensionPaymentCustomer(customerPhone, {
      customerName: reservation.user.name || "Customer",
      listingTitle: reservation.listing.title,
      duration: `${durationMinutes} minutes`,
      amount: `Rs. ${extraAmount}`,
      paymentUrl: `${appUrl}/pay/ext/${created.extension.id}?token=${encodeURIComponent(token)}`,
      idempotencyKey: `extension_payment_${created.extension.id}`,
    }).catch((error) => {
      console.error("[PostBookingService] Extension WhatsApp payment link failed:", error);
    });

    return {
      id: created.extension.id,
      token,
      paymentUrl: `${appUrl}/pay/ext/${created.extension.id}?token=${encodeURIComponent(token)}`,
      paymentSessionId: order.payment_session_id,
      mode: (process.env.CASHFREE_ENV || "SANDBOX").toLowerCase() === "production" ? "production" : "sandbox",
    };
  }

  static async createAdditionalCharge(params: {
    reservationId: string;
    ownerId: string;
    allowAdmin?: boolean;
    type: AdditionalChargeType;
    items: unknown;
    note?: string;
  }) {
    const items = sanitizeItems(params.items);
    const totalAmount = items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
    const note = params.note?.trim().slice(0, 500) || null;
    if (params.type === "DAMAGE" && !note) throw new UserFacingError("Damage charges require a note");

    const reservation = await prisma.reservation.findUnique({
      where: { id: params.reservationId },
      include: {
        user: true,
        listing: { include: { user: { include: { paymentDetails: true } } } },
      },
    });
    if (!reservation) throw new UserFacingError("Reservation not found", 404);
    if (reservation.listing.userId !== params.ownerId && !params.allowAdmin) throw new UserFacingError("Only the host can add charges", 403);
    if (!canCreatePostBookingCharge({ status: reservation.status, completedAt: reservation.completedAt })) {
      throw new UserFacingError("Charges can only be added during a checked-in session or within 24 hours after completion");
    }

    const customerPhone = normalizePhone(reservation.user.phone);
    if (!customerPhone) throw new UserFacingError("Customer must have a valid phone number before creating a payment link");

    const { token, hash } = createPaymentToken();
    const appUrl = getValidatedBaseUrl();
    const tId = `chg_${crypto.randomBytes(10).toString("hex")}`;

    const created = await prisma.$transaction(async (tx) => {
      const charge = await tx.additionalCharge.create({
        data: {
          reservationId: reservation.id,
          type: params.type,
          items: items as unknown as Prisma.InputJsonValue,
          totalAmount,
          note,
          paymentTokenHash: hash,
        },
      });

      const txn = await tx.transaction.create({
        data: {
          userId: reservation.userId,
          reservationId: reservation.id,
          listingId: reservation.listingId,
          bookingId: reservation.bookingId,
          amount: totalAmount,
          status: "PENDING",
          purpose: "ADDITIONAL_CHARGE",
          additionalChargeId: charge.id,
          description: params.type === "DAMAGE" ? "Damage charge" : "Additional service charge",
          paymentMethod: "Cashfree",
          cfTxnRef: tId,
          metadata: {
            reservationId: reservation.id,
            additionalChargeId: charge.id,
            type: params.type,
            items,
          },
        },
      });

      return { charge, txn };
    });

    let order;
    try {
      order = await cfCreateOrder({
        transaction_id: tId,
        order_amount: totalAmount,
        customer_id: reservation.userId,
        return_url: `${appUrl}/api/payments/cashfree/return?tid={transaction_id}`,
        notify_url: `${appUrl}/api/payments/cashfree/webhook`,
        customer_name: reservation.user.name || "Customer",
        customer_email: reservation.user.email || undefined,
        customer_phone: customerPhone,
        expires_at: new Date(Date.now() + ADDITIONAL_CHARGE_EXPIRY_MS),
      });
    } catch (error) {
      await prisma.$transaction(async (tx) => {
        await tx.additionalCharge.update({ where: { id: created.charge.id }, data: { status: "CANCELLED", cancelledAt: new Date(), failureReason: "Payment provider order creation failed" } });
        await tx.transaction.update({ where: { id: created.txn.id }, data: { status: "FAILED", description: "Payment provider order creation failed" } });
        await writeSystemMessage(reservation.id, "The additional payment link could not be created. Please try again.", tx);
      });
      throw error;
    }

    try {
      await prisma.$transaction(async (tx) => {
        await tx.additionalCharge.update({
          where: { id: created.charge.id },
          data: { cfOrderId: order.order_id },
        });
        await tx.transaction.update({
          where: { id: created.txn.id },
          data: { cfOrderId: order.order_id, cfPaymentSessionId: order.payment_session_id },
        });
        await writeSystemMessage(reservation.id, `Host sent a ${params.type === "DAMAGE" ? "damage" : "service"} charge for Rs. ${totalAmount}.`, tx);
      });
    } catch (error) {
      await prisma.$transaction(async (tx) => {
        await tx.additionalCharge.updateMany({
          where: { id: created.charge.id, status: "PENDING_PAYMENT" },
          data: { status: "CANCELLED", cancelledAt: new Date(), failureReason: "Payment session could not be saved" },
        });
        await tx.transaction.updateMany({
          where: { id: created.txn.id, status: "PENDING" },
          data: { status: "FAILED", description: "Payment session could not be saved" },
        });
      }).catch((cleanupError) => {
        console.error("[PostBookingService] Charge persistence cleanup failed:", cleanupError);
      });
      throw error;
    }

    await scheduleQstashJob(
      { job: "additional-charge-expiry", chargeId: created.charge.id },
      new Date(created.charge.createdAt.getTime() + ADDITIONAL_CHARGE_EXPIRY_MS),
    );

    await WhatsappService.sendAdditionalChargePaymentCustomer(customerPhone, {
      customerName: reservation.user.name || "Customer",
      listingTitle: reservation.listing.title,
      chargeType: params.type === "DAMAGE" ? "damage" : "service",
      amount: `Rs. ${totalAmount}`,
      paymentUrl: `${appUrl}/pay/charge/${created.charge.id}?token=${encodeURIComponent(token)}`,
      idempotencyKey: `charge_payment_${created.charge.id}`,
    }).catch((error) => {
      console.error("[PostBookingService] Charge WhatsApp payment link failed:", error);
    });

    return {
      id: created.charge.id,
      token,
      paymentUrl: `${appUrl}/pay/charge/${created.charge.id}?token=${encodeURIComponent(token)}`,
      paymentSessionId: order.payment_session_id,
      mode: (process.env.CASHFREE_ENV || "SANDBOX").toLowerCase() === "production" ? "production" : "sandbox",
    };
  }

  static async cancelExtensionRequest(extensionId: string, ownerId: string, allowAdmin = false) {
    const extension = await prisma.extensionRequest.findUnique({
      where: { id: extensionId },
      include: { reservation: { include: { listing: true } } },
    });
    if (!extension) throw new UserFacingError("Extension request not found", 404);
    if (extension.reservation.listing.userId !== ownerId && !allowAdmin) throw new UserFacingError("Only the host can cancel this extension", 403);
    if (extension.status !== "PENDING_PAYMENT") throw new UserFacingError("Only pending extension requests can be cancelled", 409);
    const cancelled = await prisma.$transaction(async (tx) => {
      const update = await tx.extensionRequest.updateMany({
        where: { id: extensionId, status: "PENDING_PAYMENT" },
        data: { status: "CANCELLED", cancelledAt: new Date() },
      });
      if (update.count !== 1) return false;
      await tx.transaction.updateMany({
        where: { extensionRequestId: extensionId, status: "PENDING" },
        data: { status: "CANCELLED" },
      });
      await writeSystemMessage(extension.reservationId, "Host cancelled the pending extension request.", tx);
      return true;
    });
    if (!cancelled) throw new UserFacingError("The extension status changed while it was being cancelled. Please refresh and try again.", 409);
  }

  static async cancelAdditionalCharge(chargeId: string, ownerId: string, allowAdmin = false) {
    const charge = await prisma.additionalCharge.findUnique({
      where: { id: chargeId },
      include: { reservation: { include: { listing: true } } },
    });
    if (!charge) throw new UserFacingError("Charge not found", 404);
    if (charge.reservation.listing.userId !== ownerId && !allowAdmin) throw new UserFacingError("Only the host can cancel this charge", 403);
    if (charge.status !== "PENDING_PAYMENT") throw new UserFacingError("Only pending charges can be cancelled", 409);
    const cancelled = await prisma.$transaction(async (tx) => {
      const update = await tx.additionalCharge.updateMany({
        where: { id: chargeId, status: "PENDING_PAYMENT" },
        data: { status: "CANCELLED", cancelledAt: new Date() },
      });
      if (update.count !== 1) return false;
      await tx.transaction.updateMany({
        where: { additionalChargeId: chargeId, status: "PENDING" },
        data: { status: "CANCELLED" },
      });
      await writeSystemMessage(charge.reservationId, "Host cancelled the pending charge.", tx);
      return true;
    });
    if (!cancelled) throw new UserFacingError("The charge status changed while it was being cancelled. Please refresh and try again.", 409);
  }

  static async rejectAdditionalCharge(chargeId: string, customerId: string) {
    const charge = await prisma.additionalCharge.findUnique({
      where: { id: chargeId },
      include: { reservation: true },
    });
    if (!charge) throw new UserFacingError("Charge not found", 404);
    if (charge.reservation.userId !== customerId) throw new UserFacingError("Only the customer can reject this charge", 403);
    if (charge.status !== "PENDING_PAYMENT") throw new UserFacingError("Only pending charges can be rejected", 409);
    const rejected = await prisma.$transaction(async (tx) => {
      const rejectionUpdate = await tx.additionalCharge.updateMany({
        where: { id: chargeId, status: "PENDING_PAYMENT" },
        data: { status: "REJECTED", rejectedAt: new Date() },
      });
      if (rejectionUpdate.count !== 1) return false;
      await tx.transaction.updateMany({
        where: { additionalChargeId: chargeId, status: "PENDING" },
        data: { status: "CANCELLED" },
      });
      await writeSystemMessage(charge.reservationId, "Customer rejected the pending charge.", tx);
      return true;
    });
    if (!rejected) throw new UserFacingError("The charge status changed while it was being rejected. Please refresh and try again.", 409);
  }

  static async updateAdditionalCharge(params: {
    chargeId: string;
    ownerId: string;
    allowAdmin?: boolean;
    items: unknown;
    note?: string;
  }) {
    const items = sanitizeItems(params.items);
    const totalAmount = items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
    const charge = await prisma.additionalCharge.findUnique({
      where: { id: params.chargeId },
      include: { reservation: { include: { listing: true } } },
    });
    if (!charge) throw new UserFacingError("Charge not found", 404);
    if (charge.reservation.listing.userId !== params.ownerId && !params.allowAdmin) {
      throw new UserFacingError("Only the host can edit this charge", 403);
    }
    if (charge.status !== "PENDING_PAYMENT") throw new UserFacingError("Only pending charges can be edited", 409);
    if (charge.cfOrderId) throw new UserFacingError("This charge already has a payment link. Cancel it and create a new charge to change the amount.", 409);
    const note = params.note?.trim().slice(0, 500) || charge.note || null;
    if (charge.type === "DAMAGE" && !note) throw new UserFacingError("Damage charges require a note");

    await prisma.$transaction(async (tx) => {
      await tx.additionalCharge.update({
        where: { id: params.chargeId },
        data: { items: items as unknown as Prisma.InputJsonValue, totalAmount, note },
      });
      await tx.transaction.updateMany({
        where: { additionalChargeId: params.chargeId, status: "PENDING" },
        data: {
          amount: totalAmount,
          metadata: { reservationId: charge.reservationId, additionalChargeId: charge.id, type: charge.type, items },
        },
      });
      await writeSystemMessage(charge.reservationId, `Host updated the pending ${charge.type === "DAMAGE" ? "damage" : "service"} charge to Rs. ${totalAmount}.`, tx);
    });
  }

  static async rejectAdditionalChargeByToken(chargeId: string, token: string) {
    if (!OBJECT_ID_PATTERN.test(chargeId) || !PAYMENT_TOKEN_PATTERN.test(token)) {
      throw new UserFacingError("Invalid payment link", 400);
    }
    const charge = await prisma.additionalCharge.findFirst({
      where: { id: chargeId, paymentTokenHash: tokenHash(token) },
      include: { reservation: true },
    });
    if (!charge) throw new UserFacingError("Charge not found", 404);
    if (await this.expireAdditionalChargeIfNeeded(charge)) {
      throw new UserFacingError("This charge payment link has expired", 410);
    }
    if (charge.status !== "PENDING_PAYMENT") throw new UserFacingError("Only pending charges can be rejected", 409);
    const rejected = await prisma.$transaction(async (tx) => {
      const rejectionUpdate = await tx.additionalCharge.updateMany({
        where: { id: chargeId, status: "PENDING_PAYMENT" },
        data: { status: "REJECTED", rejectedAt: new Date() },
      });
      if (rejectionUpdate.count !== 1) return false;
      await tx.transaction.updateMany({
        where: { additionalChargeId: chargeId, status: "PENDING" },
        data: { status: "CANCELLED" },
      });
      await writeSystemMessage(charge.reservationId, "Customer rejected the pending charge.", tx);
      return true;
    });
    if (!rejected) throw new UserFacingError("The charge status changed while it was being rejected. Please refresh and try again.", 409);
  }

  private static async markExtensionPaymentReview(params: {
    extensionId: string;
    reservationId: string;
    txnId: string;
    cfPaymentId?: string;
    reason: string;
  }) {
    await prisma.$transaction(async (tx) => {
      const extensionUpdate = await tx.extensionRequest.updateMany({
        where: { id: params.extensionId, status: { not: "PAID" } },
        data: {
          status: "PAYMENT_REVIEW_REQUIRED",
          cfPaymentId: params.cfPaymentId,
          paidAt: new Date(),
          failureReason: params.reason,
        },
      });
      if (extensionUpdate.count !== 1) return;
      await tx.transaction.update({
        where: { id: params.txnId },
        data: { status: "SUCCESS", cfPaymentId: params.cfPaymentId, payoutDueAt: null },
      });
      await writeSystemMessage(params.reservationId, "Extension payment needs admin review before it can be applied.", tx);
    });
  }

  private static async markChargePaymentReview(params: {
    chargeId: string;
    reservationId: string;
    txnId: string;
    cfPaymentId?: string;
    reason: string;
  }) {
    await prisma.$transaction(async (tx) => {
      const chargeUpdate = await tx.additionalCharge.updateMany({
        where: { id: params.chargeId, status: { not: "PAID" } },
        data: {
          status: "PAYMENT_REVIEW_REQUIRED",
          cfPaymentId: params.cfPaymentId,
          paidAt: new Date(),
          failureReason: params.reason,
        },
      });
      if (chargeUpdate.count !== 1) return;
      await tx.transaction.update({
        where: { id: params.txnId },
        data: { status: "SUCCESS", cfPaymentId: params.cfPaymentId, payoutDueAt: null },
      });
      await writeSystemMessage(params.reservationId, `Charge payment needs admin review: ${params.reason}`, tx);
    });
  }

  static async markExtensionPaymentFailed(txnId: string, reason = "Payment failed", cfPaymentId?: string) {
    const txn = await prisma.transaction.findUnique({
      where: { id: txnId },
      select: { status: true, extensionRequestId: true, reservationId: true },
    });
    const extensionRequestId = txn?.extensionRequestId;
    const reservationId = txn?.reservationId;
    if (!extensionRequestId || !reservationId || txn.status === "SUCCESS") return;

    await prisma.$transaction(async (tx) => {
      const extensionUpdate = await tx.extensionRequest.updateMany({
        where: { id: extensionRequestId, status: "PENDING_PAYMENT" },
        data: { status: "CANCELLED", cancelledAt: new Date(), failureReason: reason.slice(0, 500), cfPaymentId },
      });
      const transactionUpdate = await tx.transaction.updateMany({
        where: { id: txnId, status: "PENDING" },
        data: { status: "FAILED", cfPaymentId, description: reason.slice(0, 500) },
      });
      if (extensionUpdate.count > 0 || transactionUpdate.count > 0) {
        await writeSystemMessage(reservationId, "The extension payment did not complete.", tx);
      }
    });

  }

  static async markAdditionalChargePaymentFailed(txnId: string, reason = "Payment failed", cfPaymentId?: string) {
    const txn = await prisma.transaction.findUnique({
      where: { id: txnId },
      select: { status: true, additionalChargeId: true, reservationId: true },
    });
    const additionalChargeId = txn?.additionalChargeId;
    const reservationId = txn?.reservationId;
    if (!additionalChargeId || !reservationId || txn.status === "SUCCESS") return;

    await prisma.$transaction(async (tx) => {
      const chargeUpdate = await tx.additionalCharge.updateMany({
        where: { id: additionalChargeId, status: "PENDING_PAYMENT" },
        data: { status: "CANCELLED", cancelledAt: new Date(), failureReason: reason.slice(0, 500), cfPaymentId },
      });
      const transactionUpdate = await tx.transaction.updateMany({
        where: { id: txnId, status: "PENDING" },
        data: { status: "FAILED", cfPaymentId, description: reason.slice(0, 500) },
      });
      if (chargeUpdate.count > 0 || transactionUpdate.count > 0) {
        await writeSystemMessage(reservationId, "The additional payment did not complete.", tx);
      }
    });
  }

  static async applyExtensionPayment(txnId: string, cfPaymentId?: string) {
    await retryTransientDatabaseOperation(() => this.applyExtensionPaymentOnce(txnId, cfPaymentId));
  }

  private static async applyExtensionPaymentOnce(txnId: string, cfPaymentId?: string) {
    const txn = await prisma.transaction.findUnique({
      where: { id: txnId },
      include: {
        extensionRequest: {
          include: {
            reservation: {
              include: {
                listing: { include: { user: { include: { paymentDetails: true } } } },
              },
            },
          },
        },
      },
    });
    const extension = txn?.extensionRequest;
    const reservation = extension?.reservation;
    if (!txn || !extension || !reservation) return;
    if (extension.status === "PAID") {
      await InvoiceService.sendCustomerPostBookingInvoice(txn.id).catch((error) => {
        console.error("[PostBookingService] Extension invoice recovery failed:", error);
      });
      return;
    }
    if (extension.status !== "PENDING_PAYMENT") {
      await this.markExtensionPaymentReview({
        extensionId: extension.id,
        reservationId: reservation.id,
        txnId: txn.id,
        cfPaymentId,
        reason: `Payment arrived after extension request status changed to ${extension.status}`,
      });
      return;
    }

    const conflict = await checkSetConflicts({
      listingId: reservation.listingId,
      date: reservation.startDate,
      startTime: extension.oldEndTime,
      endTime: extension.requestedEndTime,
      setIds: reservation.setIds,
      excludeReservationId: reservation.id,
      skipGoogleCalendar: true,
    });

    const requestedEndMinutes = asEndOfDayMinutes(parseTimeToMinutes(extension.requestedEndTime));
    const closingMinutes = await extensionClosingMinutes(
      reservation.listingId,
      reservation.startDate,
      reservation.listing.operationalHours,
    );
    const outsideOperatingHours = !Number.isFinite(requestedEndMinutes) || requestedEndMinutes > closingMinutes;

    if (conflict.hasConflict || outsideOperatingHours || reservation.status !== "CHECKED_IN") {
      await this.markExtensionPaymentReview({
        extensionId: extension.id,
        reservationId: reservation.id,
        txnId: txn.id,
        cfPaymentId,
        reason: outsideOperatingHours
          ? "The extension is outside the studio's operating hours"
          : conflict.conflictDetails || "Reservation is no longer checked in",
      });
      return;
    }

    const rows = buildReservationSlotRows({
      listingId: reservation.listingId,
      reservationId: reservation.id,
      startDate: reservation.startDate,
      startTime: extension.oldEndTime,
      endTime: extension.requestedEndTime,
      setIds: reservation.setIds,
    });

    try {
      const applied = await prisma.$transaction(async (tx) => {
      const extensionUpdate = await tx.extensionRequest.updateMany({
        where: { id: extension.id, status: "PENDING_PAYMENT" },
        data: {
          status: "PAID",
          cfPaymentId,
          paidAt: new Date(),
          appliedAt: new Date(),
        },
      });
      if (extensionUpdate.count !== 1) return "already-claimed" as const;

      const reservationUpdate = await tx.reservation.updateMany({
        where: {
          id: reservation.id,
          status: "CHECKED_IN",
          endTime: extension.oldEndTime,
        },
        data: {
          endTime: extension.requestedEndTime,
          extensionNudgeSentAt: null,
        },
      });
      if (reservationUpdate.count !== 1) throw new Error("The session end time changed before the extension payment was applied");

      if (rows.length > 0) {
        await tx.reservationSlot.createMany({ data: rows });
      }
      await tx.transaction.update({
        where: { id: txn.id },
        data: {
          status: "SUCCESS",
          cfPaymentId,
          ...getOwnerPayoutData(reservation.listing.user.paymentDetails, txn.amount, undefined),
        },
      });
      await writeSystemMessage(reservation.id, `Extension paid. Session end time updated to ${extension.requestedEndTime}.`, tx);
      return "applied" as const;
      });
      if (applied === "already-claimed") return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!isUniqueConstraintError(error) && !message.includes("session end time changed")) throw error;
      const latest = await prisma.extensionRequest.findUnique({ where: { id: extension.id }, select: { status: true } });
      if (latest?.status === "PAID") return;
      await this.markExtensionPaymentReview({
        extensionId: extension.id,
        reservationId: reservation.id,
        txnId: txn.id,
        cfPaymentId,
        reason: message.includes("session end time changed")
          ? "The session end time changed before the extension payment was applied"
          : "Extension slot became unavailable while applying the paid extension",
      });
      return;
    }

    await scheduleQstashJob(
      { job: "auto-complete", reservationId: reservation.id },
      new Date(endTimeForDate(reservation.startDate, extension.requestedEndTime).getTime() + 2 * 60 * 60 * 1000),
    );

    await InvoiceService.sendCustomerPostBookingInvoice(txn.id).catch((error) => {
      console.error("[PostBookingService] Extension invoice generation failed:", error);
    });
  }

  static async applyAdditionalChargePayment(txnId: string, cfPaymentId?: string) {
    await retryTransientDatabaseOperation(() => this.applyAdditionalChargePaymentOnce(txnId, cfPaymentId));
  }

  private static async applyAdditionalChargePaymentOnce(txnId: string, cfPaymentId?: string) {
    const txn = await prisma.transaction.findUnique({
      where: { id: txnId },
      include: {
        additionalCharge: {
          include: {
            reservation: {
              include: {
                listing: { include: { user: { include: { paymentDetails: true } } } },
              },
            },
          },
        },
      },
    });
    const charge = txn?.additionalCharge;
    const reservation = charge?.reservation;
    if (!txn || !charge || !reservation) return;
    if (charge.status === "PAID") {
      await InvoiceService.sendCustomerPostBookingInvoice(txn.id).catch((error) => {
        console.error("[PostBookingService] Charge invoice recovery failed:", error);
      });
      return;
    }
    if (charge.status !== "PENDING_PAYMENT") {
      await this.markChargePaymentReview({
        chargeId: charge.id,
        reservationId: reservation.id,
        txnId: txn.id,
        cfPaymentId,
        reason: `Payment arrived after charge status changed to ${charge.status}`,
      });
      return;
    }

    if (charge.createdAt.getTime() + ADDITIONAL_CHARGE_EXPIRY_MS <= Date.now()) {
      await this.markChargePaymentReview({
        chargeId: charge.id,
        reservationId: reservation.id,
        txnId: txn.id,
        cfPaymentId,
        reason: "Payment arrived after the additional charge link expired",
      });
      return;
    }

    if (reservation.status !== "CHECKED_IN" && reservation.status !== "COMPLETED") {
      await this.markChargePaymentReview({
        chargeId: charge.id,
        reservationId: reservation.id,
        txnId: txn.id,
        cfPaymentId,
        reason: "The booking is no longer eligible for an additional charge",
      });
      return;
    }

    const payoutDueAt = addDays(new Date(), 5);
    const applied = await prisma.$transaction(async (tx) => {
      const chargeUpdate = await tx.additionalCharge.updateMany({
        where: { id: charge.id, status: "PENDING_PAYMENT" },
        data: { status: "PAID", cfPaymentId, paidAt: new Date() },
      });
      if (chargeUpdate.count !== 1) return false;
      await tx.transaction.update({
        where: { id: txn.id },
        data: {
          status: "SUCCESS",
          cfPaymentId,
          ...getOwnerPayoutData(reservation.listing.user.paymentDetails, txn.amount, payoutDueAt),
        },
      });
      await writeSystemMessage(reservation.id, `${charge.type === "DAMAGE" ? "Damage" : "Service"} charge paid: Rs. ${charge.totalAmount}.`, tx);
      return true;
    });
    if (!applied) return;

    await InvoiceService.sendCustomerPostBookingInvoice(txn.id).catch((error) => {
      console.error("[PostBookingService] Charge invoice generation failed:", error);
    });
  }

  static async expireExtensionRequests(limit = 200, extensionId?: string) {
    const now = new Date();
    const extensions = await prisma.extensionRequest.findMany({
      where: {
        ...(extensionId ? { id: extensionId } : {}),
        status: "PENDING_PAYMENT",
        expiresAt: { lte: now },
      },
      take: limit,
    });

    for (const extension of extensions) {
      await prisma.$transaction(async (tx) => {
        const expired = await tx.extensionRequest.updateMany({
          where: {
            id: extension.id,
            status: "PENDING_PAYMENT",
          },
          data: { status: "EXPIRED", expiredAt: now },
        });
        if (expired.count !== 1) return;
        await tx.transaction.updateMany({
          where: { extensionRequestId: extension.id, status: "PENDING" },
          data: { status: "EXPIRED" },
        });
        await writeSystemMessage(extension.reservationId, "Pending extension request expired.", tx);
      });
    }

    return extensions.map((extension) => ({ id: extension.id, status: "expired" }));
  }

  static async expireAdditionalCharges(limit = 200, chargeId?: string) {
    const now = new Date();
    const expiredBefore = new Date(now.getTime() - ADDITIONAL_CHARGE_EXPIRY_MS);
    const charges = await prisma.additionalCharge.findMany({
      where: {
        ...(chargeId ? { id: chargeId } : {}),
        createdAt: { lte: expiredBefore },
        status: "PENDING_PAYMENT",
      },
      select: { id: true, reservationId: true },
      take: limit,
    });

    const results: Array<{ id: string; status: "expired" | "skipped" }> = [];
    for (const charge of charges) {
      const expired = await prisma.$transaction(async (tx) => {
        const update = await tx.additionalCharge.updateMany({
          where: {
            id: charge.id,
            status: "PENDING_PAYMENT",
          },
          data: {
            status: "CANCELLED",
            cancelledAt: now,
            failureReason: "Payment link expired",
          },
        });
        if (update.count !== 1) return false;
        await tx.transaction.updateMany({
          where: { additionalChargeId: charge.id, status: "PENDING" },
          data: { status: "EXPIRED", description: "Additional charge payment link expired" },
        });
        await writeSystemMessage(charge.reservationId, "Pending additional charge payment link expired.", tx);
        return true;
      });
      results.push({ id: charge.id, status: expired ? "expired" : "skipped" });
    }

    return results;
  }

  static async getExtensionPayment(extensionId: string, token: string) {
    if (!OBJECT_ID_PATTERN.test(extensionId) || !PAYMENT_TOKEN_PATTERN.test(token)) return null;
    const extension = await prisma.extensionRequest.findFirst({
      where: { id: extensionId, paymentTokenHash: tokenHash(token) },
      include: {
        transactions: { orderBy: { createdAt: "desc" }, take: 1 },
        reservation: { include: { listing: true } },
      },
    });
    if (!extension) return null;
    if (extension.status === "PENDING_PAYMENT" && extension.expiresAt.getTime() <= Date.now()) return null;
    return extension;
  }

  static async createExtensionPaymentLinkForCustomer(extensionId: string, customerId: string) {
    const extension = await prisma.extensionRequest.findUnique({
      where: { id: extensionId },
      include: { reservation: true },
    });
    if (!extension) throw new UserFacingError("Extension request not found", 404);
    if (extension.reservation.userId !== customerId) throw new UserFacingError("Unauthorized", 403);
    if (extension.status !== "PENDING_PAYMENT") throw new UserFacingError("Only pending extensions can be paid", 409);
    if (extension.expiresAt.getTime() <= Date.now()) throw new UserFacingError("This extension payment link has expired", 410);

    const { token, hash } = createPaymentToken();
    await prisma.extensionRequest.update({
      where: { id: extensionId },
      data: { paymentTokenHash: hash },
    });
    return `${getValidatedBaseUrl()}/pay/ext/${extensionId}?token=${encodeURIComponent(token)}`;
  }

  private static async expireAdditionalChargeIfNeeded(charge: {
    id: string;
    reservationId: string;
    status: string;
    createdAt: Date;
  }) {
    if (
      charge.status !== "PENDING_PAYMENT" ||
      charge.createdAt.getTime() + ADDITIONAL_CHARGE_EXPIRY_MS > Date.now()
    ) {
      return false;
    }

    return await prisma.$transaction(async (tx) => {
      const expired = await tx.additionalCharge.updateMany({
        where: { id: charge.id, status: "PENDING_PAYMENT" },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          failureReason: "Payment link expired",
        },
      });
      if (expired.count !== 1) return false;
      await tx.transaction.updateMany({
        where: { additionalChargeId: charge.id, status: "PENDING" },
        data: { status: "EXPIRED", description: "Additional charge payment link expired" },
      });
      await writeSystemMessage(charge.reservationId, "Pending additional charge payment link expired.", tx);
      return true;
    });
  }

  static async getChargePayment(chargeId: string, token: string) {
    if (!OBJECT_ID_PATTERN.test(chargeId) || !PAYMENT_TOKEN_PATTERN.test(token)) return null;
    const charge = await prisma.additionalCharge.findFirst({
      where: { id: chargeId, paymentTokenHash: tokenHash(token) },
      include: {
        transactions: { orderBy: { createdAt: "desc" }, take: 1 },
        reservation: { include: { listing: true } },
      },
    });
    if (!charge) return null;
    if (await this.expireAdditionalChargeIfNeeded(charge)) return null;
    return charge;
  }

  static async createChargePaymentLinkForCustomer(chargeId: string, customerId: string) {
    const charge = await prisma.additionalCharge.findUnique({
      where: { id: chargeId },
      include: { reservation: true },
    });
    if (!charge) throw new UserFacingError("Charge not found", 404);
    if (charge.reservation.userId !== customerId) throw new UserFacingError("Unauthorized", 403);
    if (await this.expireAdditionalChargeIfNeeded(charge)) {
      throw new UserFacingError("This charge payment link has expired", 410);
    }
    if (charge.status !== "PENDING_PAYMENT") throw new UserFacingError("Only pending charges can be paid", 409);

    const { token, hash } = createPaymentToken();
    await prisma.additionalCharge.update({
      where: { id: chargeId },
      data: { paymentTokenHash: hash },
    });
    return `${getValidatedBaseUrl()}/pay/charge/${chargeId}?token=${encodeURIComponent(token)}`;
  }
}
