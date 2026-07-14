import { Prisma, ReservationStatus } from "@prisma/client";

import { checkSetConflicts, parseTimeToMinutes } from "@/lib/availability";
import { ensureCalendarEventForUser } from "@/lib/calendar/createEvent";
import { cfCreateRefund } from "@/lib/cashfree/cashfree";
import { scheduleQstashJob } from "@/lib/cron/qstash";
import {
    sendReservationCancelledOwner,
    sendReservationConfirmationCustomer,
    sendReservationConfirmationOwner,
    sendReservationPendingOwner,
    sendReservationReceivedCustomer,
    sendReservationRefundCustomer,
    sendReservationRejectedCustomer,
} from "@/lib/email/templates";
import { UserFacingError } from "@/lib/errors";
import { ensureInvoiceWithAttachment } from "@/lib/invoice/createInvoiceRecord";
import { decryptPaymentDetailsInternal } from "@/lib/payment-details";
import { PaymentVoucherService } from "@/lib/payment-voucher/service";
import { calculatePayoutDetails, hasValidGST } from "@/lib/payout/utils";
import prisma from "@/lib/prismadb";
import { legacyApprovalFromStatus, statusFromLegacyApproval } from "@/lib/reservation/status";
import { formatReservationDate, parseReservationEndTimeForDate, parseReservationTimeForDate } from "@/lib/reservation/time";
import { asEndOfDayMinutes } from "@/lib/scheduling";
import { generateBookingId } from "@/lib/utils";
import { WhatsappService } from "@/lib/whatsapp/service";
import { Addon } from "@/types/addon";
import { safeListing } from "@/types/listing";
import { PublicReservationSlot, ReservationMetadata, ReservationResult, SafeReservation } from "@/types/reservation";

const fullReservationInclude = {
    listing: { include: { user: { include: { paymentDetails: true } } } },
    user: true,
    extensionRequests: true,
    additionalCharges: true,
    invoices: true,
    Transaction: {
        where: { purpose: "BASE_BOOKING" },
        orderBy: { createdAt: "asc" },
    },
} satisfies Prisma.ReservationInclude;

type FullReservationPayload = Prisma.ReservationGetPayload<{ include: typeof fullReservationInclude }>;

const safeReservationInclude = {
    listing: {
        include: {
            sets: {
                select: { id: true, name: true, description: true, price: true },
                orderBy: { position: "asc" },
            },
        },
    },
    extensionRequests: { where: { status: "PENDING_PAYMENT" }, orderBy: { createdAt: "desc" } },
    additionalCharges: { where: { status: "PENDING_PAYMENT" }, orderBy: { createdAt: "desc" } },
    invoices: {
        where: {
            documentType: { in: ["CUSTOMER_STUDIO_TAX_INVOICE", "CUSTOMER_ARKANET_TAX_INVOICE"] },
            invoiceUrl: { not: "" },
        },
        orderBy: { createdAt: "desc" },
    },
} satisfies Prisma.ReservationInclude;

type SafeReservationPayload = Prisma.ReservationGetPayload<{ include: typeof safeReservationInclude }>;

type DocumentAttachment = {
    kind: "invoice" | "voucher";
    id: string;
    emailSentAt?: Date | null;
    attachment?: { filename: string; content: string };
};

const LISTING_WIDE_SLOT_ID = "__LISTING__";

class ReservationSlotConflictError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ReservationSlotConflictError";
    }
}

function isReservationSlotUniqueConflict(error: unknown) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") return false;
    const metadata = JSON.stringify(error.meta || {}).toLowerCase();
    return metadata.includes("reservationslot")
        || metadata.includes("slotkey")
        || metadata.includes("datekey");
}

function normalizeListingAddons(value: Prisma.JsonValue | null): Addon[] {
    if (!Array.isArray(value)) return [];
    return value.flatMap((item) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) return [];
        const record = item as Record<string, unknown>;
        const name = typeof record.name === "string" ? record.name.trim() : "";
        const price = Number(record.price);
        if (!name || !Number.isFinite(price) || price < 0) return [];
        return [{
            ...(typeof record.id === "string" && record.id ? { id: record.id } : {}),
            name,
            price,
            imageUrl: typeof record.imageUrl === "string" ? record.imageUrl : "",
            qty: Number.isInteger(Number(record.qty)) && Number(record.qty) > 0 ? Number(record.qty) : 1,
        }];
    });
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
        throw new Error("Reservation time range is invalid");
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

function parseMetadataJson(value: unknown): Prisma.InputJsonValue | null {
    if (value == null) return null;
    if (typeof value !== "string") return value as Prisma.InputJsonValue;

    try {
        return JSON.parse(value) as Prisma.InputJsonValue;
    } catch {
        return null;
    }
}

function formatSelectedAddons(value: unknown): string | null {
    const parsed = parseMetadataJson(value);
    if (!Array.isArray(parsed)) return null;

    const addons = parsed
        .map((item) => {
            if (!item || typeof item !== "object" || Array.isArray(item)) return null;
            const addon = item as Record<string, unknown>;
            const name = typeof addon.name === "string" ? addon.name.trim() : "";
            const qty = Number(addon.qty ?? 0);
            if (!name || !Number.isFinite(qty) || qty <= 0) return null;
            return qty > 1 ? `${name} x ${qty}` : name;
        })
        .filter((item): item is string => Boolean(item));

    return addons.length > 0 ? addons.join(", ") : null;
}

function getListingLocation(listing: FullReservationPayload["listing"]) {
    return (listing.actualLocation as Record<string, unknown> | null)?.display_name as string || "";
}

function getListingLocationLink(listing: FullReservationPayload["listing"]) {
    const actualLocation = listing.actualLocation as Record<string, unknown> | null;
    return String(actualLocation?.url || actualLocation?.mapsUrl || actualLocation?.googleMapsUrl || actualLocation?.display_name || "https://maps.google.com");
}

function toNotificationError(error: unknown) {
    return error instanceof Error ? error.message : String(error);
}

function bookingReminderAt(startDate: Date) {
    const target = new Date(`${startDate.toISOString().slice(0, 10)}T00:00:00.000Z`);
    target.setUTCDate(target.getUTCDate() - 1);
    return new Date(`${target.toISOString().slice(0, 10)}T06:00:00.000Z`);
}

function getPayoutDueAt(startDate: Date, endTime: string) {
    const endAt = parseReservationEndTimeForDate(startDate, endTime);
    if (!endAt) throw new Error("Cannot schedule payout because the reservation end time is invalid");
    const dueAt = new Date(endAt);

    dueAt.setMinutes(dueAt.getMinutes() + 2);

    const now = new Date();
    return dueAt.getTime() > now.getTime() ? dueAt : now;
}

function buildPayoutTransactionData(params: {
    owner: FullReservationPayload["listing"]["user"];
    amount: number;
    startDate: Date;
    endTime: string;
    schedulePayout: boolean;
}): Prisma.TransactionUncheckedUpdateInput {
    try {
        if (!params.owner.paymentDetails) return {};

        const paymentDetails = decryptPaymentDetailsInternal(params.owner.paymentDetails);
        const payoutDetails = calculatePayoutDetails(params.amount, hasValidGST(paymentDetails));
        const data: Prisma.TransactionUncheckedUpdateInput = {
            payoutAmountToOwner: payoutDetails.payoutToStudio,
            payoutPercentToOwner: payoutDetails.payoutPercentOfTotal,
            gstOwnedBy: payoutDetails.gstOwnedBy,
            baseAmountBeforeGst: payoutDetails.baseAmount,
        };

        if (params.schedulePayout) {
            data.payoutDueAt = getPayoutDueAt(params.startDate, params.endTime);
        }

        return data;
    } catch (error) {
        console.error("[ReservationService] Payout setup failed:", toNotificationError(error));
        return {};
    }
}

async function runNotification(label: string, task: () => Promise<void>) {
    try {
        await task();
    } catch (error) {
        console.error(`[ReservationService] ${label} failed:`, toNotificationError(error));
    }
}

async function markDocumentEmailSent(document?: DocumentAttachment) {
    if (!document) return;
    if (document.kind === "invoice") {
        await prisma.invoice.update({
            where: { id: document.id },
            data: { status: "EMAIL_SENT", emailSentAt: new Date(), emailError: null },
        }).catch((error) => {
            console.error("[ReservationService] Invoice email status update failed:", toNotificationError(error));
        });
        return;
    }

    await PaymentVoucherService.markEmailSent(document.id).catch((error) => {
        console.error("[ReservationService] Voucher email status update failed:", toNotificationError(error));
    });
}

async function markDocumentEmailFailed(document: DocumentAttachment | undefined, error: unknown) {
    if (!document) return;
    if (document.kind === "invoice") {
        const message = error instanceof Error ? error.message : "Invoice email failed";
        await prisma.invoice.update({
            where: { id: document.id },
            data: {
                status: "EMAIL_FAILED",
                emailError: message.slice(0, 500),
                retryCount: { increment: 1 },
            },
        }).catch((statusError) => {
            console.error("[ReservationService] Invoice email failure status update failed:", toNotificationError(statusError));
        });
        return;
    }

    await PaymentVoucherService.markEmailFailed(document.id, error).catch((statusError) => {
        console.error("[ReservationService] Voucher email failure status update failed:", toNotificationError(statusError));
    });
}

async function markDocumentDeliveryBlocked(document: DocumentAttachment | undefined, reason: string) {
    if (!document) return;
    if (document.kind === "invoice") {
        await prisma.invoice.update({
            where: { id: document.id },
            data: { status: "DELIVERY_BLOCKED", emailError: reason },
        }).catch((error) => {
            console.error("[ReservationService] Invoice delivery-blocked status update failed:", toNotificationError(error));
        });
        return;
    }

    await prisma.paymentVoucher.update({
        where: { id: document.id },
        data: { status: "DELIVERY_BLOCKED", emailError: reason },
    }).catch((error) => {
        console.error("[ReservationService] Voucher delivery-blocked status update failed:", toNotificationError(error));
    });
}

function requireDocumentAttachment(document: DocumentAttachment | undefined, label: string) {
    if (!document) {
        throw new Error(`${label} document was not generated`);
    }
    if (!document.attachment?.content) {
        throw new Error(`${label} PDF attachment is not available`);
    }
    return document.attachment;
}

async function ensureCalendarForReservation(resv: FullReservationPayload, studioName: string) {
    const startAt = parseReservationTimeForDate(resv.startDate, resv.startTime);
    const endAt = parseReservationEndTimeForDate(resv.startDate, resv.endTime);
    if (!startAt || !endAt) return;

    await ensureCalendarEventForUser({
        userId: resv.userId,
        title: `Booking: ${studioName}`,
        startIso: startAt.toISOString(),
        endIso: endAt.toISOString(),
    });
}

export class ReservationService {
    private static async refundSuccessfulReservationTransactions(reservationId: string, note: string, refundIdPrefix: string) {
        const txns = await prisma.transaction.findMany({
            where: {
                reservationId,
                status: "SUCCESS",
            },
            select: {
                id: true,
                amount: true,
                cfOrderId: true,
                payoutSplitAt: true,
            },
        });

        for (const txn of txns) {
            if (!txn.cfOrderId) {
                throw new Error("Cannot refund booking because Cashfree order ID is missing");
            }

            if (txn.payoutSplitAt) {
                throw new Error("Cannot automatically refund after owner payout split is configured. Contact support.");
            }

            const refundId = `${refundIdPrefix}_${txn.id}`;
            try {
                await cfCreateRefund({
                    order_id: txn.cfOrderId,
                    refund_amount: txn.amount,
                    refund_id: refundId,
                    refund_note: note,
                });
            } catch (error) {
                const message = toNotificationError(error);
                if (!/already|duplicate|exist/i.test(message)) {
                    throw error;
                }
                console.warn("[ReservationService] Treating existing Cashfree refund as success", { refundId, txnId: txn.id });
            }

            await prisma.transaction.update({
                where: { id: txn.id },
                data: {
                    status: "REFUNDED",
                    description: note,
                    payoutDueAt: null,
                },
            });

            await PaymentVoucherService.ensureRefundVoucherForTransaction(txn.id, note).catch((error) => {
                console.error("[ReservationService] Refund voucher generation failed:", toNotificationError(error));
            });
        }
    }
    private static async assertNoConfiguredPayoutSplit(reservationId: string) {
        const txn = await prisma.transaction.findFirst({
            where: {
                reservationId,
                payoutSplitAt: { not: null },
            },
            select: { id: true },
        });

        if (txn) {
            throw new Error("This booking already has an owner payout split configured. Contact support for cancellation or refund handling.");
        }
    }

    static async createFromTransaction(txnId: string): Promise<ReservationResult | null> {
        let result: ReservationResult | null;
        try {
            result = await prisma.$transaction(async (tx) => {
                const txn = await tx.transaction.findUnique({
                    where: { id: txnId },
                    include: {
                        listing: {
                            include: {
                                user: { include: { paymentDetails: true } },
                                sets: { select: { id: true } },
                                packages: { select: { id: true, isActive: true } },
                            }
                        },
                        user: true
                    }
                });

                if (!txn || !txn.listing || !txn.userId) throw new Error("Transaction or listing not found");
                if (txn.status !== "PENDING" && txn.status !== "SUCCESS") return null;
                if (txn.reservationId) {
                    return {
                        reservationId: txn.reservationId,
                        bookingId: txn.bookingId || "",
                        isInstant: !!txn.listing.instantBooking,
                        created: false,
                    };
                }

                const md = (txn.metadata || {}) as unknown as ReservationMetadata;
                const startDate = md.startDate ? new Date(`${md.startDate}T00:00:00.000Z`) : new Date();
                const { startTime, endTime } = md;
                const setIds = Array.isArray(md.setIds) ? md.setIds : [];
                const selectedAddons = parseMetadataJson(md.selectedAddons);
                const pricingSnapshot = parseMetadataJson(md.pricingSnapshot);
                const billingSnapshot = parseMetadataJson(md.billingSnapshot);
                const billingDetailId = typeof md.billingDetailId === "string" && /^[a-f\d]{24}$/i.test(md.billingDetailId)
                    ? md.billingDetailId
                    : null;
                const setPackageId = typeof md.setPackageId === "string" && /^[a-f\d]{24}$/i.test(md.setPackageId)
                    ? md.setPackageId
                    : null;
                const pricingRecord = pricingSnapshot && typeof pricingSnapshot === "object" && !Array.isArray(pricingSnapshot)
                    ? pricingSnapshot as Record<string, unknown>
                    : {};
                const includedSetId = typeof pricingRecord.includedSetId === "string" && setIds.includes(pricingRecord.includedSetId)
                    ? pricingRecord.includedSetId
                    : null;

                const startMinutes = parseTimeToMinutes(startTime);
                const endMinutes = asEndOfDayMinutes(parseTimeToMinutes(endTime));
                const startAt = parseReservationTimeForDate(startDate, startTime);
                if (
                    !Number.isFinite(startDate.getTime()) ||
                    !Number.isFinite(startMinutes) ||
                    !Number.isFinite(endMinutes) ||
                    endMinutes <= startMinutes ||
                    !startAt ||
                    startAt.getTime() <= Date.now()
                ) {
                    throw new ReservationSlotConflictError("The selected booking time is no longer available");
                }
                if (!txn.listing.active || txn.listing.status !== "VERIFIED") {
                    throw new ReservationSlotConflictError("This listing is no longer accepting bookings");
                }
                const availableSetIds = new Set(txn.listing.sets.map((set) => set.id));
                if (
                    (txn.listing.hasSets && setIds.length === 0) ||
                    setIds.some((setId) => !availableSetIds.has(setId))
                ) {
                    throw new ReservationSlotConflictError("One or more selected sets are no longer available");
                }
                if (setPackageId && !txn.listing.packages.some((pkg) => pkg.id === setPackageId && pkg.isActive)) {
                    throw new ReservationSlotConflictError("The selected package is no longer available");
                }

                const conflict = await checkSetConflicts({
                    listingId: txn.listingId!,
                    date: startDate,
                    startTime,
                    endTime,
                    setIds,
                    tx,
                    skipGoogleCalendar: true,
                });

                if (conflict.hasConflict) {
                    throw new ReservationSlotConflictError(conflict.conflictDetails || "Slot taken");
                }

                const bookingId = await generateBookingId();

                const reservation = await tx.reservation.create({
                    data: {
                        bookingId,
                        userId: txn.userId,
                        listingId: txn.listingId!,
                        startDate,
                        startTime,
                        endTime,
                        totalPrice: txn.amount,
                        totalPriceInt: Math.round(txn.amount),
                        setIds,
                        includedSetId,
                        setPackageId,
                        selectedAddons,
                        pricingSnapshot,
                        billingDetailId,
                        billingSnapshot,
                        isApproved: legacyApprovalFromStatus(
                            txn.listing.instantBooking ? "CONFIRMED" : "PENDING_APPROVAL"
                        ),
                        status: txn.listing.instantBooking ? "CONFIRMED" : "PENDING_APPROVAL",
                    }
                });

                const slotRows = buildReservationSlotRows({
                    listingId: txn.listingId!,
                    reservationId: reservation.id,
                    startDate,
                    startTime,
                    endTime,
                    setIds,
                });

                if (slotRows.length > 0) {
                    await tx.reservationSlot.createMany({ data: slotRows });
                }

                const payoutData = buildPayoutTransactionData({
                    owner: txn.listing.user,
                    amount: txn.amount,
                    startDate,
                    endTime,
                    schedulePayout: false,
                });

                await tx.transaction.update({
                    where: { id: txnId },
                    data: {
                        reservationId: reservation.id,
                        bookingId,
                        status: "SUCCESS",
                        purpose: "BASE_BOOKING",
                        ...payoutData,
                    }
                });

                return {
                    reservationId: reservation.id,
                    bookingId,
                    isInstant: !!txn.listing.instantBooking,
                    created: true,
                };
            }, { maxWait: 10_000, timeout: 30_000 });
        } catch (error) {
            if (error instanceof ReservationSlotConflictError || isReservationSlotUniqueConflict(error)) {
                const txn = await prisma.transaction.findUnique({ where: { id: txnId } });
                if (txn?.cfOrderId && (txn.status === "PENDING" || (txn.status === "SUCCESS" && !txn.reservationId))) {
                    try {
                        await cfCreateRefund({
                            order_id: txn.cfOrderId,
                            refund_amount: txn.amount,
                            refund_id: `rf_auto_${txnId}`,
                            refund_note: "Conflict resolution",
                        });
                    } catch (refundError) {
                        const message = toNotificationError(refundError);
                        if (!/already|duplicate|exist/i.test(message)) {
                            await prisma.transaction.update({
                                where: { id: txnId },
                                data: { description: "Slot conflict detected; automatic refund is pending retry" },
                            }).catch(() => undefined);
                            throw refundError;
                        }
                    }
                    await prisma.transaction.update({
                        where: { id: txnId },
                        data: { status: "REFUNDED", description: "Refunded: slot was reserved by another booking" },
                    });
                    await this.handleFailedPayment(txnId).catch((notifyError) => {
                        console.error("[ReservationService] Failed to notify customer after slot conflict:", notifyError);
                    });
                } else if (txn && !txn.cfOrderId) {
                    await prisma.transaction.update({
                        where: { id: txnId },
                        data: { status: "FAILED", description: "Booking failed: slot was reserved by another booking" },
                    });
                }
                return null;
            }
            throw error;
        }

        if (result?.reservationId) {
            if (result.created) {
                const createdReservation = await prisma.reservation.findUnique({
                    where: { id: result.reservationId },
                    select: { createdAt: true, startDate: true, status: true },
                });
                if (createdReservation) {
                    if (createdReservation.status === "PENDING_APPROVAL") {
                        await scheduleQstashJob(
                            { job: "pending-approval-expiry", reservationId: result.reservationId },
                            new Date(createdReservation.createdAt.getTime() + 24 * 60 * 60 * 1000),
                        );
                    } else if (createdReservation.status === "CONFIRMED") {
                        await scheduleQstashJob(
                            { job: "booking-reminder", reservationId: result.reservationId },
                            bookingReminderAt(createdReservation.startDate),
                        );
                    }
                }
            }
            await this.runPostReservationSideEffects(result.reservationId, txnId, Boolean(result.created));
        } else {
            const txn = await prisma.transaction.findUnique({
                where: { id: txnId },
                select: { status: true },
            });
            if (txn?.status === "FAILED" || txn?.status === "REFUNDED") {
                await this.handleFailedPayment(txnId).catch((notifyError) => {
                    console.error("[ReservationService] Failed to notify customer after failed reservation creation:", notifyError);
                });
            }
        }

        return result;
    }

    static async ensurePostReservationSideEffects(txnId: string) {
        const txn = await prisma.transaction.findUnique({
            where: { id: txnId },
            select: { reservationId: true, purpose: true },
        });

        if (!txn?.reservationId) return;
        if (txn.purpose !== "BASE_BOOKING") return;

        await this.runPostReservationSideEffects(txn.reservationId, txnId, false);
    }

    private static async runPostReservationSideEffects(reservationId: string, txnId: string, force: boolean) {
        try {
            const fullResv = await prisma.reservation.findUnique({
                where: { id: reservationId },
                include: fullReservationInclude,
            });

            if (!fullResv) return;

            const txn = fullResv.Transaction.find((item) => item.id === txnId) || fullResv.Transaction[0];
            let document: DocumentAttachment | undefined;
            try {
                if (fullResv.status === "CONFIRMED") {
                    const invoiceRes = await ensureInvoiceWithAttachment({
                        userId: fullResv.userId,
                        reservationId,
                        transactionId: txnId
                    });
                    document = {
                        kind: "invoice",
                        id: invoiceRes.invoice.id,
                        emailSentAt: invoiceRes.invoice.emailSentAt,
                        attachment: invoiceRes.attachment,
                    };
                } else if (fullResv.status === "PENDING_APPROVAL") {
                    const voucherRes = await PaymentVoucherService.ensureReceiptVoucherForTransaction(txnId);
                    document = {
                        kind: "voucher",
                        id: voucherRes.voucher.id,
                        emailSentAt: voucherRes.voucher.emailSentAt,
                        attachment: voucherRes.attachment,
                    };
                }
            } catch (error) {
                console.error("[ReservationService] Booking document generation failed:", error);
            }

            const documentNeedsEmail = Boolean(document && !document.emailSentAt);
            const hasPendingNotification =
                Boolean(fullResv.user.email && !txn?.emailSentCustomer) ||
                Boolean(fullResv.listing.user.email && !txn?.emailSentOwner) ||
                Boolean(fullResv.user.phone && !txn?.whatsappSentCustomer) ||
                Boolean(fullResv.listing.user.phone && !txn?.whatsappSentHost) ||
                documentNeedsEmail;

            if (!force && !hasPendingNotification) return;

            await this.triggerInitialNotifications(fullResv, document, txnId);
        } catch (error) {
            console.error("[ReservationService] Post-reservation side effects failed:", error);
        }
    }

    private static async triggerInitialNotifications(resv: FullReservationPayload, document: DocumentAttachment | undefined, txnId: string) {
        const txn = resv.Transaction.find((item) => item.id === txnId) || resv.Transaction[0];
        const listing = resv.listing;
        const md = (txn?.metadata || {}) as unknown as ReservationMetadata;

        const dateStr = formatReservationDate(resv.startDate);
        const timeSlot = `${resv.startTime} to ${resv.endTime}`;
        const studioName = listing.title;
        const location = getListingLocation(listing);
        const locationLink = getListingLocationLink(listing);
        const addons = formatSelectedAddons(md.selectedAddons);
        const isInstant = resv.status === "CONFIRMED" || listing.instantBooking === true;
        const customerEmail = resv.user.email;
        const ownerEmail = listing.user.email;
        const customerPhone = resv.user.phone;
        const ownerPhone = listing.user.phone;
        const notificationTasks: Array<Promise<void>> = [];

        if (document && !document.emailSentAt && !customerEmail) {
            await markDocumentDeliveryBlocked(document, "Customer email is missing");
        }

        if (txn?.id && customerEmail) {
            notificationTasks.push(runNotification("customer initial email", async () => {
                const claim = await prisma.transaction.updateMany({
                    where: { id: txn.id, emailSentCustomer: false },
                    data: { emailSentCustomer: true },
                });
                const shouldSendForDocument = Boolean(document && !document.emailSentAt);

                if (claim.count > 0 || shouldSendForDocument) {
                    try {
                        const sendCustomerEmail = isInstant
                            ? sendReservationConfirmationCustomer
                            : sendReservationReceivedCustomer;
                        const attachment = requireDocumentAttachment(
                            document,
                            isInstant ? "Customer invoice" : "Payment receipt"
                        );

                        await sendCustomerEmail({
                            toEmail: customerEmail,
                            toName: resv.user.name || "Valued Customer",
                            studioName,
                            bookingId: resv.bookingId || "",
                            startDate: dateStr,
                            startTime: resv.startTime,
                            endTime: resv.endTime,
                            totalPrice: resv.totalPrice,
                            addons,
                            studioLocation: location,
                            attachments: [attachment],
                        });
                        await markDocumentEmailSent(document);
                    } catch (error) {
                        await prisma.transaction.update({
                            where: { id: txn.id },
                            data: { emailSentCustomer: false },
                        });
                        await markDocumentEmailFailed(document, error);
                        throw error;
                    }
                }
            }));
        }

        if (txn?.id && ownerEmail) {
            notificationTasks.push(runNotification("owner initial email", async () => {
                const claim = await prisma.transaction.updateMany({
                    where: { id: txn.id, emailSentOwner: false },
                    data: { emailSentOwner: true },
                });

                if (claim.count > 0) {
                    try {
                        const sendOwnerEmail = isInstant
                            ? sendReservationConfirmationOwner
                            : sendReservationPendingOwner;
                        await sendOwnerEmail({
                            toEmail: ownerEmail,
                            toName: listing.user.name || "Studio Owner",
                            customerName: resv.user.name || "Customer",
                            studioName,
                            bookingId: resv.bookingId || "",
                            startDate: dateStr,
                            startTime: resv.startTime,
                            endTime: resv.endTime,
                            totalPrice: resv.totalPrice,
                            addons,
                        });
                    } catch (error) {
                        await prisma.transaction.update({
                            where: { id: txn.id },
                            data: { emailSentOwner: false },
                        });
                        throw error;
                    }
                }
            }));
        }

        if (txn?.id && customerPhone) {
            notificationTasks.push(runNotification("customer initial WhatsApp", async () => {
                const claim = await prisma.transaction.updateMany({
                    where: { id: txn.id, whatsappSentCustomer: false },
                    data: { whatsappSentCustomer: true },
                });

                if (claim.count > 0) {
                    try {
                        if (listing.instantBooking) {
                            await WhatsappService.sendBookingConfirmedCustomer(customerPhone, {
                                customerName: resv.user.name || "Customer",
                                listingTitle: studioName,
                                startDate: dateStr,
                                startTime: timeSlot,
                                locationLink,
                                idempotencyKey: `confirm_cust_${resv.id}`
                            });
                        } else {
                            await WhatsappService.sendBookingReceivedCustomer(customerPhone, {
                                customerName: resv.user.name || "Customer",
                                listingTitle: studioName,
                                startDate: dateStr,
                                startTime: timeSlot,
                                idempotencyKey: `receive_cust_${resv.id}`
                            });
                        }
                    } catch (error) {
                        await prisma.transaction.update({
                            where: { id: txn.id },
                            data: { whatsappSentCustomer: false },
                        });
                        throw error;
                    }
                }
            }));
        }

        if (txn?.id && ownerPhone) {
            notificationTasks.push(runNotification("owner initial WhatsApp", async () => {
                const claim = await prisma.transaction.updateMany({
                    where: { id: txn.id, whatsappSentHost: false },
                    data: { whatsappSentHost: true },
                });

                if (claim.count > 0) {
                    try {
                        await WhatsappService.sendBookingReceivedHost(ownerPhone, {
                            hostName: listing.user.name || "Studio Owner",
                            customerName: resv.user.name || "Customer",
                            listingTitle: studioName,
                            startDate: dateStr,
                            startTime: timeSlot,
                            idempotencyKey: `notify_host_${resv.id}`
                        });
                    } catch (error) {
                        await prisma.transaction.update({
                            where: { id: txn.id },
                            data: { whatsappSentHost: false },
                        });
                        throw error;
                    }
                }
            }));
        }

        if (isInstant) {
            notificationTasks.push(runNotification("customer calendar", async () => {
                await ensureCalendarForReservation(resv, studioName);
            }));
        }

        await Promise.all(notificationTasks);
    }

    private static async getFullReservationOrThrow(reservationId: string) {
        const resv = await prisma.reservation.findUnique({
            where: { id: reservationId },
            include: fullReservationInclude,
        });

        if (!resv) throw new UserFacingError("Reservation not found", 404);
        return resv;
    }

    private static assertHost(resv: FullReservationPayload, userId: string, allowAdmin = false) {
        const isHost = resv.listing.user.id === userId;
        if (!isHost && !allowAdmin) throw new UserFacingError("Only hosts can perform this action", 403);
    }

    private static assertCustomer(resv: FullReservationPayload, userId: string) {
        if (resv.userId !== userId) throw new UserFacingError("Only customers can perform this action", 403);
    }

    private static async clearOpenPayouts(reservationId: string) {
        await prisma.transaction.updateMany({
            where: {
                reservationId,
                OR: [
                    { payoutDoneAt: null },
                    { payoutDoneAt: { isSet: false } },
                ],
            },
            data: { payoutDueAt: null },
        });
    }

    private static async writeSystemMessage(reservationId: string, text: string) {
        await prisma.reservationChatMessage.create({
            data: {
                reservationId,
                kind: "SYSTEM",
                text,
            },
        }).catch((error) => {
            console.error("[ReservationService] Failed to write system message:", toNotificationError(error));
        });
    }

    private static currentStatus(resv: {
        status?: ReservationStatus | null;
        isApproved?: number | null;
        checkedInAt?: Date | null;
        completedAt?: Date | null;
    }) {
        if (!resv.status && resv.completedAt) return "COMPLETED" as const;
        if (!resv.status && resv.checkedInAt) return "CHECKED_IN" as const;
        if (resv.status === "PENDING_APPROVAL" && resv.completedAt) return "COMPLETED" as const;
        if (resv.status === "PENDING_APPROVAL" && resv.checkedInAt) return "CHECKED_IN" as const;
        if (resv.status === "PENDING_APPROVAL" && resv.isApproved != null && resv.isApproved !== 0) {
            return statusFromLegacyApproval(resv.isApproved);
        }
        return resv.status || statusFromLegacyApproval(resv.isApproved);
    }

    static async approve(reservationId: string, userId: string, allowAdmin = false): Promise<void> {
        const resv = await this.getFullReservationOrThrow(reservationId);
        this.assertHost(resv, userId, allowAdmin);

        if (this.currentStatus(resv) !== "PENDING_APPROVAL") {
            throw new UserFacingError("Only pending reservations can be approved");
        }

        const payoutData = buildPayoutTransactionData({
            owner: resv.listing.user,
            amount: resv.totalPrice,
            startDate: resv.startDate,
            endTime: resv.endTime,
            schedulePayout: false,
        });

        await prisma.$transaction(async (tx) => {
            const update = await tx.reservation.updateMany({
                where: { id: reservationId, status: this.currentStatus(resv) },
                data: { status: "CONFIRMED", isApproved: legacyApprovalFromStatus("CONFIRMED"), rejectReason: null },
            });
            if (update.count !== 1) throw new UserFacingError("Reservation status changed while processing. Please refresh and try again.", 409);

            if (Object.keys(payoutData).length > 0) {
                await tx.transaction.updateMany({
                    where: {
                        reservationId,
                        status: "SUCCESS",
                        purpose: "BASE_BOOKING",
                        OR: [{ payoutDoneAt: null }, { payoutDoneAt: { isSet: false } }],
                    },
                    data: { ...payoutData, payoutDueAt: null },
                });
            }
        });

        await scheduleQstashJob({ job: "booking-reminder", reservationId }, bookingReminderAt(resv.startDate));

        await this.triggerStatusNotifications(resv, "APPROVED");
    }

    static async decline(reservationId: string, userId: string, reason?: string, allowAdmin = false): Promise<void> {
        const resv = await this.getFullReservationOrThrow(reservationId);
        this.assertHost(resv, userId, allowAdmin);

        if (this.currentStatus(resv) !== "PENDING_APPROVAL") {
            throw new UserFacingError("Only pending reservations can be declined");
        }

        const rejectionReason = reason?.trim().slice(0, 500);
        if (!rejectionReason) throw new UserFacingError("A rejection reason is required");

        await this.assertNoConfiguredPayoutSplit(reservationId);

        const current = this.currentStatus(resv);
        const update = await prisma.reservation.updateMany({
            where: { id: reservationId, status: current },
            data: {
                status: "CANCELLED",
                isApproved: legacyApprovalFromStatus("CANCELLED"),
                rejectReason: rejectionReason,
            }
        });

        if (update.count !== 1) {
            throw new UserFacingError("Reservation status changed while processing. Please refresh and try again.", 409);
        }

        try {
            const refundDescription = `Refunded: host rejected booking - ${rejectionReason}`
                .trim()
                .slice(0, 500);
            await this.refundSuccessfulReservationTransactions(
                reservationId,
                refundDescription,
                "rf_reject"
            );
        } catch (error) {
            await prisma.reservation.updateMany({
                where: { id: reservationId, status: "CANCELLED" },
                data: {
                    status: current,
                    isApproved: legacyApprovalFromStatus(current),
                    rejectReason: resv.rejectReason || null,
                },
            });
            throw error;
        }

        await prisma.reservationSlot.deleteMany({ where: { reservationId } });
        await this.clearOpenPayouts(reservationId);
        await this.triggerStatusNotifications(resv, "DECLINED", rejectionReason);
    }

    static async cancel(reservationId: string, userId: string): Promise<void> {
        const resv = await this.getFullReservationOrThrow(reservationId);
        this.assertCustomer(resv, userId);

        if (this.currentStatus(resv) !== "PENDING_APPROVAL") {
            throw new UserFacingError("Confirmed bookings cannot be cancelled automatically. Contact support for cancellation and refund handling.", 409);
        }

        await this.assertNoConfiguredPayoutSplit(reservationId);

        const current = this.currentStatus(resv);
        const update = await prisma.reservation.updateMany({
            where: { id: reservationId, status: current },
            data: {
                status: "CANCELLED",
                isApproved: legacyApprovalFromStatus("CANCELLED"),
            },
        });

        if (update.count !== 1) {
            throw new UserFacingError("Reservation status changed while processing. Please refresh and try again.", 409);
        }

        try {
            await this.refundSuccessfulReservationTransactions(
                reservationId,
                "Refunded: customer cancelled before host approval",
                "rf_cancel"
            );
        } catch (error) {
            await prisma.reservation.updateMany({
                where: { id: reservationId, status: "CANCELLED" },
                data: {
                    status: current,
                    isApproved: legacyApprovalFromStatus(current),
                },
            });
            throw error;
        }

        await prisma.reservationSlot.deleteMany({ where: { reservationId } });
        await this.clearOpenPayouts(reservationId);
        await this.triggerStatusNotifications(resv, "CANCELLED");
    }

    static async checkIn(reservationId: string, userId: string, options: { now?: Date; allowAdmin?: boolean } = {}): Promise<void> {
        const resv = await this.getFullReservationOrThrow(reservationId);
        this.assertHost(resv, userId, options.allowAdmin);

        if (this.currentStatus(resv) !== "CONFIRMED") {
            throw new UserFacingError("Only confirmed reservations can be checked in");
        }

        const startAt = parseReservationTimeForDate(resv.startDate, resv.startTime);
        const endAt = parseReservationEndTimeForDate(resv.startDate, resv.endTime);
        const now = options.now ?? new Date();
        if (!startAt || !endAt) throw new UserFacingError("Reservation schedule is invalid");
        if (now.getTime() < startAt.getTime() - 30 * 60 * 1000) {
            throw new UserFacingError("Check-in opens 30 minutes before the scheduled start time");
        }
        if (now.getTime() > endAt.getTime() + 2 * 60 * 60 * 1000) {
            throw new UserFacingError("Check-in window has closed for this booking");
        }

        const checkedInAt = now;
        const update = await prisma.reservation.updateMany({
            where: {
                id: reservationId,
                status: "CONFIRMED",
                OR: [{ checkedInAt: null }, { checkedInAt: { isSet: false } }],
            },
            data: {
                status: "CHECKED_IN",
                isApproved: legacyApprovalFromStatus("CHECKED_IN"),
                checkedInAt,
            },
        });

        if (update.count !== 1) {
            const latest = await prisma.reservation.findUnique({ where: { id: reservationId }, select: { status: true, checkedInAt: true } });
            if (latest?.status === "CHECKED_IN" && latest.checkedInAt) return;
            throw new UserFacingError("Reservation could not be checked in. Please refresh and try again.", 409);
        }

        await this.writeSystemMessage(reservationId, "Host checked in the customer for this session.");
        const completionEndAt = parseReservationEndTimeForDate(resv.startDate, resv.endTime);
        if (completionEndAt) {
            await scheduleQstashJob({ job: "auto-complete", reservationId }, new Date(completionEndAt.getTime() + 2 * 60 * 60 * 1000));
        }
    }

    static async complete(reservationId: string, userId: string, options: { system?: boolean; allowAdmin?: boolean } = {}): Promise<void> {
        const resv = await this.getFullReservationOrThrow(reservationId);
        if (!options.system) this.assertHost(resv, userId, options.allowAdmin);

        if (this.currentStatus(resv) !== "CHECKED_IN" || !resv.checkedInAt) {
            throw new UserFacingError("Only checked-in reservations can be completed");
        }

        const completedAt = new Date();
        const transitioned = await prisma.$transaction(async (tx) => {
            const update = await tx.reservation.updateMany({
                where: { id: reservationId, status: "CHECKED_IN", checkedInAt: { not: null } },
                data: {
                    status: "COMPLETED",
                    isApproved: legacyApprovalFromStatus("COMPLETED"),
                    completedAt,
                },
            });
            if (update.count !== 1) {
                const latest = await tx.reservation.findUnique({ where: { id: reservationId }, select: { status: true } });
                if (latest?.status === "COMPLETED") return false;
                throw new UserFacingError("Reservation status changed while processing. Please refresh and try again.", 409);
            }

            const payoutTransactions = await tx.transaction.findMany({
                where: {
                    reservationId,
                    status: "SUCCESS",
                    purpose: { in: ["BASE_BOOKING", "EXTENSION"] },
                    OR: [{ payoutDoneAt: null }, { payoutDoneAt: { isSet: false } }],
                },
                select: { id: true, amount: true },
            });

            for (const transaction of payoutTransactions) {
                const payoutData = buildPayoutTransactionData({
                    owner: resv.listing.user,
                    amount: transaction.amount,
                    startDate: resv.startDate,
                    endTime: resv.endTime,
                    schedulePayout: true,
                });
                if (Object.keys(payoutData).length > 0) {
                    await tx.transaction.update({
                        where: { id: transaction.id },
                        data: payoutData,
                    });
                }
            }
            return true;
        });

        if (!transitioned) return;

        await this.writeSystemMessage(reservationId, options.system
            ? "This session was automatically completed after the checked-in booking ended."
            : "Host marked this session as completed."
        );
        await scheduleQstashJob(
            { job: "review-reminder", reservationId },
            new Date(completedAt.getTime() + 24 * 60 * 60 * 1000),
        );
    }

    static async markNoShow(reservationId: string, userId: string, allowAdmin = false): Promise<void> {
        const resv = await this.getFullReservationOrThrow(reservationId);
        this.assertHost(resv, userId, allowAdmin);

        if (this.currentStatus(resv) !== "CONFIRMED") {
            throw new UserFacingError("Only confirmed reservations can be marked as no-show");
        }

        const startAt = parseReservationTimeForDate(resv.startDate, resv.startTime);
        if (!startAt) throw new UserFacingError("Reservation schedule is invalid");
        if (Date.now() < startAt.getTime() + 30 * 60 * 1000) {
            throw new UserFacingError("No-show can be marked 30 minutes after the scheduled start time");
        }

        await prisma.$transaction(async (tx) => {
            const update = await tx.reservation.updateMany({
                where: { id: reservationId, status: "CONFIRMED" },
                data: {
                    status: "NO_SHOW",
                    isApproved: legacyApprovalFromStatus("NO_SHOW"),
                    noShowAt: new Date(),
                },
            });
            if (update.count !== 1) {
                throw new UserFacingError("Reservation status changed while processing. Please refresh and try again.", 409);
            }

            const transactions = await tx.transaction.findMany({
                where: {
                    reservationId,
                    status: "SUCCESS",
                    purpose: "BASE_BOOKING",
                    OR: [{ payoutDoneAt: null }, { payoutDoneAt: { isSet: false } }],
                },
                select: { id: true, amount: true },
            });
            for (const transaction of transactions) {
                const payoutData = buildPayoutTransactionData({
                    owner: resv.listing.user,
                    amount: transaction.amount,
                    startDate: resv.startDate,
                    endTime: resv.endTime,
                    schedulePayout: true,
                });
                if (Object.keys(payoutData).length > 0) {
                    await tx.transaction.update({ where: { id: transaction.id }, data: payoutData });
                }
            }
            await tx.reservationSlot.deleteMany({ where: { reservationId } });
        });
        await this.writeSystemMessage(reservationId, "Host marked this session as a no-show.");
    }

    static async recordRefund(params: {
        reservationId: string;
        adminId: string;
        status: Extract<ReservationStatus, "REFUNDED" | "PARTIALLY_REFUNDED">;
        amount: number;
        note?: string;
    }): Promise<void> {
        const amount = Math.max(0, Math.round(params.amount));
        if (amount <= 0) throw new UserFacingError("Refund amount must be greater than zero");

        await prisma.$transaction(async (tx) => {
            const [reservation, captured] = await Promise.all([
                tx.reservation.findUnique({
                    where: { id: params.reservationId },
                    select: { status: true },
                }),
                tx.transaction.aggregate({
                    where: { reservationId: params.reservationId, status: { in: ["SUCCESS", "REFUNDED"] } },
                    _sum: { amount: true },
                }),
            ]);
            if (!reservation) throw new UserFacingError("Reservation not found", 404);
            if (reservation.status === "REFUNDED" || reservation.status === "PARTIALLY_REFUNDED") {
                throw new UserFacingError("A refund has already been recorded for this reservation", 409);
            }
            const capturedAmount = Math.round(captured._sum.amount || 0);
            if (capturedAmount <= 0 || amount > capturedAmount) {
                throw new UserFacingError("Refund amount cannot exceed the captured payment amount");
            }
            if (params.status === "REFUNDED" && amount !== capturedAmount) {
                throw new UserFacingError("A full refund must equal the captured payment amount");
            }
            if (params.status === "PARTIALLY_REFUNDED" && amount >= capturedAmount) {
                throw new UserFacingError("A partial refund must be less than the captured payment amount");
            }

            await tx.reservation.update({
                where: { id: params.reservationId },
                data: {
                    status: params.status,
                    isApproved: legacyApprovalFromStatus(params.status),
                    refundAmount: amount,
                    refundRecordedAt: new Date(),
                    refundNote: params.note?.trim().slice(0, 500) || null,
                },
            });
            await tx.transaction.updateMany({
                where: {
                    reservationId: params.reservationId,
                    OR: [{ payoutDoneAt: null }, { payoutDoneAt: { isSet: false } }],
                },
                data: { payoutDueAt: null },
            });
            await tx.auditLog.create({
                data: {
                    userId: params.adminId,
                    action: "BOOKING_REFUND_RECORDED",
                    resource: "Reservation",
                    resourceId: params.reservationId,
                    metadata: {
                        status: params.status,
                        amount,
                        note: params.note || null,
                    },
                },
            });
        });

        await this.writeSystemMessage(params.reservationId, `Admin recorded ${params.status === "REFUNDED" ? "a full" : "a partial"} refund of Rs. ${amount}.`);
    }

    static async updateStatus(
        reservationId: string,
        userId: string,
        status: Extract<ReservationStatus, "CONFIRMED" | "CANCELLED">,
        reason?: string,
        allowAdmin = false
    ): Promise<void> {
        if (status === "CONFIRMED") return this.approve(reservationId, userId, allowAdmin);
        if (reason?.trim()) return this.decline(reservationId, userId, reason, allowAdmin);
        return this.cancel(reservationId, userId);
    }

    private static async triggerStatusNotifications(
        resv: FullReservationPayload,
        event: "APPROVED" | "DECLINED" | "CANCELLED",
        reason?: string
    ) {
        const txn = resv.Transaction[0];
        const dateStr = formatReservationDate(resv.startDate);
        const timeStr = `${resv.startTime} to ${resv.endTime}`;
        const location = getListingLocation(resv.listing);
        const locationLink = getListingLocationLink(resv.listing);
        const customerEmail = resv.user.email;
        const customerPhone = resv.user.phone;
        const ownerEmail = resv.listing.user.email;
        const ownerPhone = resv.listing.user.phone;
        const notificationTasks: Array<Promise<void>> = [];

        if (event === "APPROVED") {
            let invoiceDocument: DocumentAttachment | undefined;
            if (txn?.id) {
                try {
                    const invoiceRes = await ensureInvoiceWithAttachment({
                        userId: resv.userId,
                        reservationId: resv.id,
                        transactionId: txn.id,
                    });
                    invoiceDocument = {
                        kind: "invoice",
                        id: invoiceRes.invoice.id,
                        emailSentAt: invoiceRes.invoice.emailSentAt,
                        attachment: invoiceRes.attachment,
                    };
                } catch (error) {
                    console.error("[ReservationService] Approval invoice generation failed:", toNotificationError(error));
                }
            }

            if (invoiceDocument && !invoiceDocument.emailSentAt && !customerEmail) {
                await markDocumentDeliveryBlocked(invoiceDocument, "Customer email is missing");
            }

            if (txn?.id && customerEmail) {
                notificationTasks.push(runNotification("customer approval email", async () => {
                    const claim = await prisma.transaction.updateMany({
                        where: { id: txn.id, emailSentApprovalCustomer: false },
                        data: { emailSentApprovalCustomer: true },
                    });
                    const shouldSendForDocument = Boolean(invoiceDocument && !invoiceDocument.emailSentAt);

                    if (claim.count > 0 || shouldSendForDocument) {
                        try {
                            const attachment = requireDocumentAttachment(invoiceDocument, "Customer invoice");
                            await sendReservationConfirmationCustomer({
                                toEmail: customerEmail,
                                toName: resv.user.name || "Valued Customer",
                                studioName: resv.listing.title,
                                bookingId: resv.bookingId || "",
                                startDate: dateStr,
                                startTime: resv.startTime,
                                endTime: resv.endTime,
                                totalPrice: resv.totalPrice,
                                studioLocation: location,
                                attachments: [attachment],
                            });
                            await markDocumentEmailSent(invoiceDocument);
                        } catch (error) {
                            await prisma.transaction.update({
                                where: { id: txn.id },
                                data: { emailSentApprovalCustomer: false },
                            });
                            await markDocumentEmailFailed(invoiceDocument, error);
                            throw error;
                        }
                    }
                }));
            }

            notificationTasks.push(runNotification("customer calendar", async () => {
                await ensureCalendarForReservation(resv, resv.listing.title);
            }));

            if (txn?.id && customerPhone) {
                notificationTasks.push(runNotification("customer approval WhatsApp", async () => {
                    const claim = await prisma.transaction.updateMany({
                        where: { id: txn.id, whatsappSentApprovalCustomer: false },
                        data: { whatsappSentApprovalCustomer: true },
                    });

                    if (claim.count > 0) {
                        try {
                            await WhatsappService.sendBookingConfirmedCustomer(customerPhone, {
                                customerName: resv.user.name || "Customer",
                                listingTitle: resv.listing.title,
                                startDate: dateStr,
                                startTime: timeStr,
                                locationLink,
                                idempotencyKey: `approve_cust_${resv.id}`
                            });
                        } catch (error) {
                            await prisma.transaction.update({
                                where: { id: txn.id },
                                data: { whatsappSentApprovalCustomer: false },
                            });
                            throw error;
                        }
                    }
                }));
            }
        } else if (event === "DECLINED") {
            let refundDocument: DocumentAttachment | undefined;
            if (txn?.id) {
                try {
                    const voucherRes = await PaymentVoucherService.ensureRefundVoucherForTransaction(
                        txn.id,
                        reason ? `Refunded: host rejected booking - ${reason}` : "Refunded: host rejected booking"
                    );
                    refundDocument = {
                        kind: "voucher",
                        id: voucherRes.voucher.id,
                        emailSentAt: voucherRes.voucher.emailSentAt,
                        attachment: voucherRes.attachment,
                    };
                } catch (error) {
                    console.error("[ReservationService] Rejection refund voucher generation failed:", toNotificationError(error));
                }
            }

            if (txn?.id && customerEmail) {
                notificationTasks.push(runNotification("customer rejection email", async () => {
                    const claim = await prisma.transaction.updateMany({
                        where: { id: txn.id, emailSentRejectionCustomer: false },
                        data: { emailSentRejectionCustomer: true },
                    });
                    const shouldSendForDocument = Boolean(refundDocument && !refundDocument.emailSentAt);

                    if (claim.count > 0 || shouldSendForDocument) {
                        try {
                            const attachment = requireDocumentAttachment(refundDocument, "Refund voucher");
                            await sendReservationRejectedCustomer({
                                toEmail: customerEmail,
                                toName: resv.user.name || "Valued Customer",
                                studioName: resv.listing.title,
                                startDate: dateStr,
                                startTime: resv.startTime,
                                endTime: resv.endTime,
                                totalPrice: resv.totalPrice,
                                rejectReason: reason,
                                attachments: [attachment],
                            });
                            await markDocumentEmailSent(refundDocument);
                        } catch (error) {
                            await prisma.transaction.update({
                                where: { id: txn.id },
                                data: { emailSentRejectionCustomer: false },
                            });
                            await markDocumentEmailFailed(refundDocument, error);
                            throw error;
                        }
                    }
                }));
            }

            if (txn?.id && customerPhone) {
                notificationTasks.push(runNotification("customer rejection WhatsApp", async () => {
                    const claim = await prisma.transaction.updateMany({
                        where: { id: txn.id, whatsappSentRejectionCustomer: false },
                        data: { whatsappSentRejectionCustomer: true },
                    });

                    if (claim.count > 0) {
                        try {
                            await WhatsappService.sendBookingRejectedCustomer(customerPhone, {
                                customerName: resv.user.name || "Customer",
                                listingTitle: resv.listing.title,
                                rejectReason: reason || "Not specified",
                                idempotencyKey: `reject_cust_${resv.id}`
                            });
                        } catch (error) {
                            await prisma.transaction.update({
                                where: { id: txn.id },
                                data: { whatsappSentRejectionCustomer: false },
                            });
                            throw error;
                        }
                    }
                }));
            }
        } else if (event === "CANCELLED") {
            let refundDocument: DocumentAttachment | undefined;
            if (txn?.id) {
                try {
                    const voucherRes = await PaymentVoucherService.ensureRefundVoucherForTransaction(
                        txn.id,
                        "Refunded: customer cancelled before host approval"
                    );
                    refundDocument = {
                        kind: "voucher",
                        id: voucherRes.voucher.id,
                        emailSentAt: voucherRes.voucher.emailSentAt,
                        attachment: voucherRes.attachment,
                    };
                } catch (error) {
                    console.error("[ReservationService] Cancellation refund voucher generation failed:", toNotificationError(error));
                }
            }

            if (txn?.id && customerEmail) {
                notificationTasks.push(runNotification("customer cancellation refund email", async () => {
                    const shouldSendForDocument = Boolean(refundDocument && !refundDocument.emailSentAt);
                    if (!shouldSendForDocument) return;
                    try {
                        const attachment = requireDocumentAttachment(refundDocument, "Refund voucher");
                        await sendReservationRefundCustomer({
                            toEmail: customerEmail,
                            toName: resv.user.name || "Valued Customer",
                            studioName: resv.listing.title,
                            startDate: dateStr,
                            startTime: resv.startTime,
                            endTime: resv.endTime,
                            totalPrice: resv.totalPrice,
                            reason: "Customer cancelled before host approval",
                            attachments: [attachment],
                        });
                        await markDocumentEmailSent(refundDocument);
                    } catch (error) {
                        await markDocumentEmailFailed(refundDocument, error);
                        throw error;
                    }
                }));
            }

            if (txn?.id && ownerEmail) {
                notificationTasks.push(runNotification("owner cancellation email", async () => {
                    const claim = await prisma.transaction.updateMany({
                        where: { id: txn.id, emailSentCancellationHost: false },
                        data: { emailSentCancellationHost: true },
                    });

                    if (claim.count > 0) {
                        try {
                            await sendReservationCancelledOwner({
                                toEmail: ownerEmail,
                                toName: resv.listing.user.name || "Studio Owner",
                                customerName: resv.user.name || "Customer",
                                studioName: resv.listing.title,
                                startDate: dateStr,
                                startTime: resv.startTime,
                                endTime: resv.endTime,
                                totalPrice: resv.totalPrice,
                            });
                        } catch (error) {
                            await prisma.transaction.update({
                                where: { id: txn.id },
                                data: { emailSentCancellationHost: false },
                            });
                            throw error;
                        }
                    }
                }));
            }

            if (txn?.id && ownerPhone) {
                notificationTasks.push(runNotification("owner cancellation WhatsApp", async () => {
                    const claim = await prisma.transaction.updateMany({
                        where: { id: txn.id, whatsappSentCancellationHost: false },
                        data: { whatsappSentCancellationHost: true },
                    });

                    if (claim.count > 0) {
                        try {
                            await WhatsappService.sendBookingCancelledHost(ownerPhone, {
                                hostName: resv.listing.user.name || "Host",
                                customerName: resv.user.name || "Customer",
                                listingTitle: resv.listing.title,
                                startDate: dateStr,
                                idempotencyKey: `cancel_host_${resv.id}`
                            });
                        } catch (error) {
                            await prisma.transaction.update({
                                where: { id: txn.id },
                                data: { whatsappSentCancellationHost: false },
                            });
                            throw error;
                        }
                    }
                }));
            }
        }

        await Promise.all(notificationTasks);
    }

    static async reconcileTransaction(txnId: string): Promise<Prisma.TransactionGetPayload<{ include: { reservation: { include: { listing: true } }, listing: true, user: true } }> | null> {
        const txn = await prisma.transaction.findUnique({
            where: { id: txnId },
            include: { reservation: { include: { listing: true } }, listing: true, user: true }
        });
        if (!txn || txn.status !== "PENDING" || !txn.cfOrderId) return txn;

        try {
            const { cfFetchOrder, cfMapStatus } = await import("@/lib/cashfree/cashfree");
            const order = await cfFetchOrder(txn.cfOrderId);
            if (order?.order_status) {
                const newStatus = cfMapStatus(order.order_status);
                if (newStatus === "SUCCESS") {
                    if (txn.purpose === "EXTENSION") {
                        const { PostBookingService } = await import("@/lib/post-booking/service");
                        await PostBookingService.applyExtensionPayment(txn.id);
                    } else if (txn.purpose === "ADDITIONAL_CHARGE") {
                        const { PostBookingService } = await import("@/lib/post-booking/service");
                        await PostBookingService.applyAdditionalChargePayment(txn.id);
                    } else {
                        await this.createFromTransaction(txn.id);
                    }
                    return await prisma.transaction.findUnique({
                        where: { id: txn.id },
                        include: { reservation: { include: { listing: true } }, listing: true, user: true }
                    });
                }

                if (newStatus !== "PENDING") {
                    const updatedTxn = await prisma.transaction.update({
                        where: { id: txn.id },
                        data: { status: newStatus },
                        include: { reservation: { include: { listing: true } }, listing: true, user: true }
                    });

                    if (newStatus === "FAILED") {
                        if (txn.purpose === "EXTENSION") {
                            const { PostBookingService } = await import("@/lib/post-booking/service");
                            await PostBookingService.markExtensionPaymentFailed(txn.id, "Cashfree reported the extension payment as failed");
                        } else if (txn.purpose === "ADDITIONAL_CHARGE") {
                            const { PostBookingService } = await import("@/lib/post-booking/service");
                            await PostBookingService.markAdditionalChargePaymentFailed(txn.id, "Cashfree reported the additional payment as failed");
                        } else {
                            await this.handleFailedPayment(txn.id);
                        }
                    }
                    return updatedTxn;
                }
            }
        } catch (e) {
            console.error("[ReservationService] Reconciliation failed", e);
        }
        return txn;
    }

    static async handleFailedPayment(txnId: string): Promise<void> {
        const txn = await prisma.transaction.findUnique({
            where: { id: txnId },
            include: { user: true }
        });

        if (!txn || !txn.user?.email || txn.emailSentFailed) return;

        try {
            const { sendReservationFailedEmail } = await import("@/lib/email/templates");
            await prisma.transaction.update({
                where: { id: txnId },
                data: { emailSentFailed: true }
            });

            await sendReservationFailedEmail({
                toEmail: txn.user.email,
                toName: txn.user.name || "Customer",
                orderId: txn.cfOrderId || "N/A"
            });
        } catch (e) {
            await prisma.transaction.update({
                where: { id: txnId },
                data: { emailSentFailed: false }
            });
            throw e;
        }
    }

    static async delete(reservationId: string, userId: string, allowAdmin = false): Promise<void> {
        const resv = await prisma.reservation.findUnique({
            where: { id: reservationId },
            include: { listing: { include: { user: true } } }
        });

        if (!resv) throw new UserFacingError("Reservation not found", 404);
        const isHost = resv.listing.user.id === userId;
        const isCustomer = resv.userId === userId;

        if (!isHost && !isCustomer && !allowAdmin) throw new UserFacingError("Unauthorized", 403);

        const deletableStatuses: ReservationStatus[] = [
            "CANCELLED",
            "COMPLETED",
            "NO_SHOW",
            "REFUNDED",
            "PARTIALLY_REFUNDED",
        ];
        if (!deletableStatuses.includes(this.currentStatus(resv))) {
            throw new UserFacingError("Active reservations must be cancelled or completed before they can be removed", 409);
        }

        await prisma.reservation.update({
            where: { id: reservationId },
            data: {
                markedForDeletion: true,
                markedForDeletionAt: new Date(),
            }
        });
        await prisma.reservationSlot.deleteMany({ where: { reservationId } });
    }

    static async sendReminders(
        rangeStart: Date,
        rangeEnd: Date,
        createdAfter?: Date,
    ): Promise<Array<{ id: string; status: string; error?: string }>> {
        const reservations = await prisma.reservation.findMany({
            where: {
                startDate: { gte: rangeStart, lte: rangeEnd },
                ...(createdAfter ? { createdAt: { gte: createdAfter } } : {}),
                reminderSent: false,
                status: "CONFIRMED",
                markedForDeletion: false,
                Transaction: { some: { status: "SUCCESS" } }
            },
            include: { user: true, listing: true }
        });

        const results: Array<{ id: string; status: string; error?: string }> = [];
        for (const res of reservations) {
            if (res.user?.phone) {
                try {
                    await WhatsappService.sendBookingReminderCustomer(res.user.phone, {
                        customerName: res.user.name || "Customer",
                        listingTitle: res.listing.title,
                        startTime: res.endTime ? `${res.startTime} to ${res.endTime}` : res.startTime,
                        idempotencyKey: `reminder_${res.id}`,
                    });

                    await prisma.reservation.update({
                        where: { id: res.id },
                        data: { reminderSent: true }
                    });
                    results.push({ id: res.id, status: "sent" });
                } catch (error) {
                    const message = error instanceof Error ? error.message : "WhatsApp failed";
                    results.push({ id: res.id, status: "failed", error: message });
                }
            }
        }
        return results;
    }

    static async expirePendingApprovalReservations(
        reference = new Date(),
        onlyReservationId?: string,
        createdAfter?: Date,
    ): Promise<Array<{ id: string; status: string; error?: string }>> {
        const cutoff = new Date(reference.getTime() - 24 * 60 * 60 * 1000);
        const reason = "Auto-rejected: host did not respond within 24 hours";
        const reservations = await prisma.reservation.findMany({
            where: {
                ...(onlyReservationId ? { id: onlyReservationId } : {}),
                status: "PENDING_APPROVAL",
                createdAt: {
                    lte: cutoff,
                    ...(createdAfter ? { gte: createdAfter } : {}),
                },
                markedForDeletion: false,
                Transaction: { some: { status: "SUCCESS" } },
            },
            include: fullReservationInclude,
            take: 50,
        });

        const results: Array<{ id: string; status: string; error?: string }> = [];
        for (const reservation of reservations) {
            try {
                const claim = await prisma.reservation.updateMany({
                    where: { id: reservation.id, status: "PENDING_APPROVAL" },
                    data: {
                        status: "CANCELLED",
                        isApproved: legacyApprovalFromStatus("CANCELLED"),
                        rejectReason: reason,
                    },
                });
                if (claim.count !== 1) {
                    results.push({ id: reservation.id, status: "skipped" });
                    continue;
                }

                try {
                    await this.refundSuccessfulReservationTransactions(
                        reservation.id,
                        "Refunded: host did not respond within 24 hours",
                        "rf_timeout"
                    );
                } catch (error) {
                    await prisma.reservation.updateMany({
                        where: { id: reservation.id, status: "CANCELLED", rejectReason: reason },
                        data: {
                            status: "PENDING_APPROVAL",
                            isApproved: legacyApprovalFromStatus("PENDING_APPROVAL"),
                            rejectReason: reservation.rejectReason || null,
                        },
                    });
                    throw error;
                }
                await prisma.reservationSlot.deleteMany({ where: { reservationId: reservation.id } });
                await prisma.transaction.updateMany({
                    where: {
                        reservationId: reservation.id,
                        OR: [
                            { payoutDoneAt: null },
                            { payoutDoneAt: { isSet: false } },
                        ],
                    },
                    data: { payoutDueAt: null },
                });

                const refreshed = await prisma.reservation.findUnique({
                    where: { id: reservation.id },
                    include: fullReservationInclude,
                });
                if (refreshed) {
                    await this.triggerStatusNotifications(refreshed, "DECLINED", reason);
                }
                results.push({ id: reservation.id, status: "expired" });
            } catch (error) {
                results.push({
                    id: reservation.id,
                    status: "failed",
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }

        return results;
    }

    static async getReservations(params: {
        reservationId?: string;
        listingId?: string;
        userId?: string;
        authorId?: string;
        status?: ReservationStatus;
    }): Promise<SafeReservation[]> {
        return (await this.getReservationsPage(params, { page: 1, pageSize: params.reservationId ? 1 : 100 })).reservations;
    }

    static async getReservationsPage(params: {
        reservationId?: string;
        listingId?: string;
        userId?: string;
        authorId?: string;
        status?: ReservationStatus;
    }, options: { page?: number; pageSize?: number } = {}) {
        const { reservationId, listingId, userId, authorId, status } = params;
        const requestedPage = typeof options.page === "number" && Number.isFinite(options.page)
            ? Math.max(1, Math.floor(options.page))
            : 1;
        const pageSize = typeof options.pageSize === "number" && Number.isFinite(options.pageSize)
            ? Math.min(100, Math.max(1, Math.floor(options.pageSize)))
            : 50;
        const query: Prisma.ReservationWhereInput = { markedForDeletion: false };

        if (reservationId) query.id = reservationId;
        if (listingId) query.listingId = listingId;
        if (userId) query.userId = userId;
        if (authorId) query.listing = { userId: authorId };
        if (status) query.status = status;

        const total = await prisma.reservation.count({ where: query });
        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        const page = Math.min(requestedPage, totalPages);
        const [reservations, amenityDefinitions] = await Promise.all([
            prisma.reservation.findMany({
                where: query,
                include: safeReservationInclude,
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            prisma.amenities.findMany({ select: { id: true, name: true }, take: 500 }),
        ]);
        const amenityNamesById = new Map(amenityDefinitions.map((amenity) => [amenity.id, amenity.name]));

        return {
            reservations: reservations.map((reservation) => this.normalizeReservation(reservation, amenityNamesById)),
            pagination: {
                page,
                pageSize,
                total,
                totalPages,
            },
        };
    }

    static async getPublicReservationSlots(listingId: string): Promise<PublicReservationSlot[]> {
        const indiaDate = new Date(Date.now() + (5 * 60 + 30) * 60_000).toISOString().slice(0, 10);
        const rangeStart = new Date(`${indiaDate}T00:00:00.000Z`);
        const rangeEnd = new Date(rangeStart.getTime() + 91 * 24 * 60 * 60_000);
        const reservations = await prisma.reservation.findMany({
            where: {
                listingId,
                startDate: { gte: rangeStart, lt: rangeEnd },
                markedForDeletion: false,
                status: { in: ["PENDING_APPROVAL", "CONFIRMED", "CHECKED_IN"] },
            },
            select: {
                startDate: true,
                startTime: true,
                endTime: true,
                setIds: true,
            },
            orderBy: { startDate: "asc" },
        });

        return reservations.map((reservation) => ({
            ...reservation,
            startDate: reservation.startDate.toISOString(),
        }));
    }

    private static normalizeReservation(
        r: SafeReservationPayload,
        amenityNamesById: Map<string, string> = new Map()
    ): SafeReservation {
        const {
            isApproved: _legacyApproval,
            billingDetailId: _billingDetailId,
            billingSnapshot: _billingSnapshot,
            extensionNudgeSentAt: _extensionNudgeSentAt,
            reminderSent: _reminderSent,
            reviewReminderSentAt: _reviewReminderSentAt,
            reviewReminderClaimedAt: _reviewReminderClaimedAt,
            reviewReminderAttempts: _reviewReminderAttempts,
            unreadCountOwner: _unreadCountOwner,
            unreadCountGuest: _unreadCountGuest,
            lastMessageText: _lastMessageText,
            lastMessageAt: _lastMessageAt,
            updatedAt: _updatedAt,
            extensionRequests,
            additionalCharges,
            invoices,
            listing,
            ...reservation
        } = r;
        const bookedSets = listing.sets
            .filter((set) => r.setIds.includes(set.id))
            .map((set) => ({
                id: set.id,
                name: set.name,
                description: set.description,
                price: set.price,
            }));
        const bookingAmenities = Array.from(new Set([
            ...listing.amenities.map((amenity) => amenityNamesById.get(amenity) || amenity),
            ...listing.otherAmenities,
        ].filter(Boolean)));
        const {
            verifications: _listingVerifications,
            reviewedAt: _listingReviewedAt,
            reviewedById: _listingReviewedById,
            rejectionReason: _listingRejectionReason,
            curatedSource: _listingCuratedSource,
            contactEmail: _listingContactEmail,
            notifyEmailSentAt: _listingNotifyEmailSentAt,
            notifyReminderAt: _listingNotifyReminderAt,
            inConversation: _listingInConversation,
            enquiryCount: _listingEnquiryCount,
            accountDeactivatedAt: _listingAccountDeactivatedAt,
            addons: listingAddons,
            operationalDays: _listingOperationalDays,
            operationalHours: _listingOperationalHours,
            actualLocation: _listingActualLocation,
            sets: _listingSets,
            ...safeReservationListing
        } = listing;

        const normalizedListing: safeListing = {
            ...safeReservationListing,
            createdAt: listing.createdAt.toISOString(),
            addons: normalizeListingAddons(listingAddons),
            avgReviewRating: listing.avgReviewRating ?? undefined,
        };

        return {
            ...reservation,
            createdAt: r.createdAt.toISOString(),
            startDate: r.startDate.toISOString(),
            startTime: r.startTime,
            endTime: r.endTime,
            markedForDeletionAt: r.markedForDeletionAt?.toISOString() || null,
            checkedInAt: r.checkedInAt?.toISOString() || null,
            completedAt: r.completedAt?.toISOString() || null,
            noShowAt: r.noShowAt?.toISOString() || null,
            refundRecordedAt: r.refundRecordedAt?.toISOString() || null,
            pendingExtensionCount: extensionRequests?.filter((item) => item.status === "PENDING_PAYMENT").length || 0,
            pendingChargeCount: additionalCharges?.filter((item) => item.status === "PENDING_PAYMENT").length || 0,
            pendingExtensions: extensionRequests?.map((item) => ({
                id: item.id,
                durationMinutes: item.durationMinutes,
                extraAmount: item.extraAmount,
                status: item.status,
                requestedEndTime: item.requestedEndTime,
            })) || [],
            pendingCharges: additionalCharges?.map((item) => ({
                id: item.id,
                type: item.type,
                items: item.items,
                totalAmount: item.totalAmount,
                status: item.status,
                note: item.note,
            })) || [],
            receipts: invoices?.map((invoice) => ({
                invoiceNumber: invoice.invoiceNumber,
                invoiceUrl: invoice.invoiceUrl,
            })) || [],
            bookedSets,
            bookingAmenities,
            listing: normalizedListing,
        };
    }

    static async checkUserBooking(userId: string, listingId: string) {
        const resv = await prisma.reservation.findFirst({
            where: {
                listingId,
                userId,
                status: "COMPLETED",
                markedForDeletion: false,
                Review: { none: { userId } },
            },
            orderBy: { completedAt: 'desc' },
            select: { id: true, startDate: true, startTime: true, endTime: true, status: true }
        });

        if (!resv) return null;

        const endAt = parseReservationEndTimeForDate(resv.startDate, resv.endTime);
        const now = new Date();
        const canReview = Boolean(endAt && endAt.getTime() <= now.getTime());

        return { id: resv.id, canReview, status: resv.status, endAt: endAt?.toISOString() || null };
    }
}
