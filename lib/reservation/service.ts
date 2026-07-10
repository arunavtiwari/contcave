import { Prisma } from "@prisma/client";
import { format } from "date-fns";

import { checkSetConflicts, parseTimeToMinutes } from "@/lib/availability";
import { ensureCalendarEventForUser } from "@/lib/calendar/createEvent";
import { cfCreateRefund } from "@/lib/cashfree/cashfree";
import {
    sendReservationCancelledOwner,
    sendReservationConfirmationCustomer,
    sendReservationConfirmationOwner,
    sendReservationPendingOwner,
    sendReservationReceivedCustomer,
    sendReservationRefundCustomer,
    sendReservationRejectedCustomer,
} from "@/lib/email/templates";
import { ensureInvoiceWithAttachment } from "@/lib/invoice/createInvoiceRecord";
import { decryptPaymentDetailsInternal } from "@/lib/payment-details";
import { PaymentVoucherService } from "@/lib/payment-voucher/service";
import { calculatePayoutDetails, hasValidGST } from "@/lib/payout/utils";
import prisma from "@/lib/prismadb";
import { generateBookingId } from "@/lib/utils";
import { WhatsappService } from "@/lib/whatsapp/service";
import { safeListing } from "@/types/listing";
import { ReservationMetadata, ReservationResult, SafeReservation } from "@/types/reservation";

type FullReservationPayload = Prisma.ReservationGetPayload<{
    include: {
        listing: { include: { user: { include: { paymentDetails: true } } } };
        user: true;
        Transaction: { orderBy: { createdAt: "desc" } };
    };
}>;

type DocumentAttachment = {
    kind: "invoice" | "voucher";
    id: string;
    emailSentAt?: Date | null;
    attachment?: { filename: string; content: string };
};

const LISTING_WIDE_SLOT_ID = "__LISTING__";

function buildReservationSlotRows(params: {
    listingId: string;
    reservationId: string;
    startDate: Date;
    startTime: string;
    endTime: string;
    setIds: string[];
}) {
    const start = parseTimeToMinutes(params.startTime);
    let end = parseTimeToMinutes(params.endTime);
    if (end <= start) end = start + 60;

    const dateKey = format(params.startDate, "yyyy-MM-dd");
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

function parseTimeForDate(date: Date, label: string) {
    const ymd = format(date, "yyyy-MM-dd");
    const value = String(label || "").trim();
    const m12 = value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    const m24 = value.match(/^(\d{1,2}):(\d{2})$/);

    if (m12) {
        let hour = Number(m12[1]);
        const minute = Number(m12[2]);
        const period = m12[3].toUpperCase();
        if (period === "PM" && hour < 12) hour += 12;
        if (period === "AM" && hour === 12) hour = 0;
        return new Date(`${ymd}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`);
    }

    if (m24) {
        return new Date(`${ymd}T${m24[1].padStart(2, "0")}:${m24[2]}:00`);
    }

    return null;
}

function getPayoutDueAt(startDate: Date, endTime: string) {
    const endAt = parseTimeForDate(startDate, endTime);
    const dueAt = endAt || new Date(startDate);

    if (!endAt) {
        dueAt.setHours(23, 59, 0, 0);
    }

    dueAt.setMinutes(dueAt.getMinutes() + 2);

    const now = new Date();
    return dueAt.getTime() > now.getTime() ? dueAt : now;
}

function buildPayoutTransactionData(params: {
    owner: FullReservationPayload["listing"]["user"];
    amount: number;
    startDate: Date;
    endTime: string;
    approved: boolean;
}): Prisma.TransactionUncheckedUpdateInput {
    try {
        if (!params.owner.paymentDetails) return {};

        const paymentDetails = decryptPaymentDetailsInternal(params.owner.paymentDetails);
        const vendorId = paymentDetails.cashfreeVendorId?.trim();
        if (!vendorId) return {};

        const payoutDetails = calculatePayoutDetails(params.amount, hasValidGST(paymentDetails));
        const data: Prisma.TransactionUncheckedUpdateInput = {
            vendorId,
            payoutAmountToOwner: payoutDetails.payoutToStudio,
            payoutPercentToOwner: payoutDetails.payoutPercentOfTotal,
            gstOwnedBy: payoutDetails.gstOwnedBy,
            baseAmountBeforeGst: payoutDetails.baseAmount,
        };

        if (params.approved) {
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
    const startAt = parseTimeForDate(resv.startDate, resv.startTime);
    const endAt = parseTimeForDate(resv.startDate, resv.endTime);
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
                    if (!txn.cfOrderId) {
                        await tx.transaction.update({
                            where: { id: txnId },
                            data: { status: "FAILED", description: `Booking failed: ${conflict.conflictDetails || "Slot taken"}` }
                        });
                        return null;
                    }

                    await cfCreateRefund({ order_id: txn.cfOrderId, refund_amount: txn.amount, refund_id: `rf_auto_${txnId}`, refund_note: "Conflict resolution" });
                    await tx.transaction.update({
                        where: { id: txnId },
                        data: { status: "REFUNDED", description: `Refunded: ${conflict.conflictDetails || "Slot taken"}` }
                    });
                    return null;
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
                        selectedAddons,
                        pricingSnapshot,
                        billingDetailId,
                        billingSnapshot,
                        isApproved: txn.listing.instantBooking ? 1 : 0,
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

                const isApproved = txn.listing.instantBooking === true;
                const payoutData = buildPayoutTransactionData({
                    owner: txn.listing.user,
                    amount: txn.amount,
                    startDate,
                    endTime,
                    approved: isApproved,
                });

                await tx.transaction.update({
                    where: { id: txnId },
                    data: {
                        reservationId: reservation.id,
                        bookingId,
                        status: "SUCCESS",
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
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
                const txn = await prisma.transaction.findUnique({ where: { id: txnId } });
                if (txn?.cfOrderId && (txn.status === "PENDING" || (txn.status === "SUCCESS" && !txn.reservationId))) {
                    await cfCreateRefund({
                        order_id: txn.cfOrderId,
                        refund_amount: txn.amount,
                        refund_id: `rf_auto_${txnId}`,
                        refund_note: "Conflict resolution",
                    }).catch((refundError) => {
                        console.error("[ReservationService] Auto-refund failed after slot conflict:", refundError);
                    });
                    await prisma.transaction.update({
                        where: { id: txnId },
                        data: { status: "REFUNDED", description: "Refunded: slot was reserved by another booking" }
                    });
                    await this.handleFailedPayment(txnId).catch((notifyError) => {
                        console.error("[ReservationService] Failed to notify customer after slot conflict:", notifyError);
                    });
                }
                return null;
            }
            throw error;
        }

        if (result?.reservationId) {
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
            select: { reservationId: true },
        });

        if (!txn?.reservationId) return;

        await this.runPostReservationSideEffects(txn.reservationId, txnId, false);
    }

    private static async runPostReservationSideEffects(reservationId: string, txnId: string, force: boolean) {
        try {
            const fullResv = await prisma.reservation.findUnique({
                where: { id: reservationId },
                include: {
                    user: true,
                    listing: { include: { user: { include: { paymentDetails: true } } } },
                    Transaction: { orderBy: { createdAt: "desc" } },
                }
            }) as FullReservationPayload | null;

            if (!fullResv) return;

            const txn = fullResv.Transaction.find((item) => item.id === txnId) || fullResv.Transaction[0];
            let document: DocumentAttachment | undefined;
            try {
                if (fullResv.isApproved === 1) {
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
                } else if (fullResv.isApproved === 0) {
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

        const dateStr = format(resv.startDate, "dd MMM yyyy");
        const timeSlot = `${resv.startTime} to ${resv.endTime}`;
        const studioName = listing.title;
        const location = getListingLocation(listing);
        const locationLink = getListingLocationLink(listing);
        const addons = formatSelectedAddons(md.selectedAddons);
        const isInstant = resv.isApproved === 1 || listing.instantBooking === true;
        const customerEmail = resv.user.email;
        const ownerEmail = listing.user.email;
        const customerPhone = resv.user.phone;
        const ownerPhone = listing.user.phone;
        const notificationTasks: Array<Promise<void>> = [];

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

    static async updateStatus(reservationId: string, userId: string, status: number, reason?: string): Promise<void> {
        const resv = await prisma.reservation.findUnique({
            where: { id: reservationId },
            include: {
                listing: { include: { user: { include: { paymentDetails: true } } } },
                user: true,
                Transaction: { orderBy: { createdAt: "desc" } },
            }
        });

        if (!resv) throw new Error("Reservation not found");

        const isHost = resv.listing.user.id === userId;
        const isCustomer = resv.userId === userId;

        if (!isHost && !isCustomer) throw new Error("Unauthorized");

        if (status !== 1 && status !== 2 && status !== 3) {
            throw new Error("Invalid reservation status");
        }

        if (status === 1 || status === 2) {
            if (!isHost) throw new Error("Only hosts can approve/reject");
        }
        if (status === 3) {
            if (!isCustomer) throw new Error("Only customers can cancel");
        }

        const previousStatus = resv.isApproved;

        if (previousStatus === status) {
            if (status === 2 || status === 3) {
                await prisma.reservationSlot.deleteMany({ where: { reservationId } });
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
            await this.triggerStatusNotifications(resv, status, reason);
            return;
        }

        if ((status === 1 || status === 2) && previousStatus !== 0) {
            throw new Error("Only pending reservations can be approved or rejected");
        }

        if (status === 3 && previousStatus !== 0) {
            throw new Error("Confirmed bookings cannot be cancelled automatically. Contact support for cancellation and refund handling.");
        }

        if (status === 2 || status === 3) {
            await this.assertNoConfiguredPayoutSplit(reservationId);
        }

        const updateResult = await prisma.reservation.updateMany({
            where: {
                id: reservationId,
                isApproved: previousStatus,
            },
            data: { isApproved: status, rejectReason: reason || null }
        });

        if (updateResult.count !== 1) {
            throw new Error("Reservation status changed while processing. Please refresh and try again.");
        }

        try {
            if (status === 2) {
                const refundDescription = `Refunded: host rejected booking${reason ? ` - ${reason}` : ""}`
                    .trim()
                    .slice(0, 500);
                await this.refundSuccessfulReservationTransactions(
                    reservationId,
                    refundDescription,
                    "rf_reject"
                );
            }

            if (status === 3) {
                await this.refundSuccessfulReservationTransactions(
                    reservationId,
                    "Refunded: customer cancelled before host approval",
                    "rf_cancel"
                );
            }
        } catch (error) {
            await prisma.reservation.updateMany({
                where: { id: reservationId, isApproved: status },
                data: { isApproved: previousStatus, rejectReason: resv.rejectReason || null },
            });
            throw error;
        }

        if (status === 2 || status === 3) {
            await prisma.reservationSlot.deleteMany({ where: { reservationId } });
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

        if (status === 1) {
            const payoutData = buildPayoutTransactionData({
                owner: resv.listing.user,
                amount: resv.totalPrice,
                startDate: resv.startDate,
                endTime: resv.endTime,
                approved: true,
            });

            if (Object.keys(payoutData).length > 0) {
                await prisma.transaction.updateMany({
                    where: {
                        reservationId,
                        status: "SUCCESS",
                        OR: [
                            { payoutDoneAt: null },
                            { payoutDoneAt: { isSet: false } },
                        ],
                    },
                    data: payoutData,
                });
            }
        }

        await this.triggerStatusNotifications(resv, status, reason);
    }

    private static async triggerStatusNotifications(resv: FullReservationPayload, status: number, reason?: string) {
        const txn = resv.Transaction[0];
        const dateStr = format(resv.startDate, "dd MMM yyyy");
        const timeStr = `${resv.startTime} to ${resv.endTime}`;
        const location = getListingLocation(resv.listing);
        const locationLink = getListingLocationLink(resv.listing);
        const customerEmail = resv.user.email;
        const customerPhone = resv.user.phone;
        const ownerEmail = resv.listing.user.email;
        const ownerPhone = resv.listing.user.phone;
        const notificationTasks: Array<Promise<void>> = [];

        if (status === 1) {
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
        } else if (status === 2) {
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
        } else if (status === 3) {
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
                    await this.createFromTransaction(txn.id);
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
                        await this.handleFailedPayment(txn.id);
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

    static async delete(reservationId: string, userId: string): Promise<void> {
        const resv = await prisma.reservation.findUnique({
            where: { id: reservationId },
            include: { listing: { include: { user: true } } }
        });

        if (!resv) throw new Error("Reservation not found");
        const isHost = resv.listing.user.id === userId;
        const isCustomer = resv.userId === userId;

        if (!isHost && !isCustomer) throw new Error("Unauthorized");

        await prisma.reservation.update({
            where: { id: reservationId },
            data: {
                markedForDeletion: true,
                markedForDeletionAt: new Date(),
            }
        });
        await prisma.reservationSlot.deleteMany({ where: { reservationId } });
    }

    static async sendReminders(rangeStart: Date, rangeEnd: Date): Promise<Array<{ id: string; status: string; error?: string }>> {
        const reservations = await prisma.reservation.findMany({
            where: {
                startDate: { gte: rangeStart, lte: rangeEnd },
                reminderSent: false,
                isApproved: 1,
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
        onlyReservationId?: string
    ): Promise<Array<{ id: string; status: string; error?: string }>> {
        const cutoff = new Date(reference.getTime() - 24 * 60 * 60 * 1000);
        const reason = "Auto-rejected: host did not respond within 24 hours";
        const reservations = await prisma.reservation.findMany({
            where: {
                ...(onlyReservationId ? { id: onlyReservationId } : {}),
                isApproved: 0,
                createdAt: { lte: cutoff },
                markedForDeletion: false,
                Transaction: { some: { status: "SUCCESS" } },
            },
            include: {
                listing: { include: { user: { include: { paymentDetails: true } } } },
                user: true,
                Transaction: { orderBy: { createdAt: "desc" } },
            },
            take: 50,
        }) as FullReservationPayload[];

        const results: Array<{ id: string; status: string; error?: string }> = [];
        for (const reservation of reservations) {
            try {
                const claim = await prisma.reservation.updateMany({
                    where: { id: reservation.id, isApproved: 0 },
                    data: { isApproved: 2, rejectReason: reason },
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
                        where: { id: reservation.id, isApproved: 2, rejectReason: reason },
                        data: { isApproved: 0, rejectReason: reservation.rejectReason || null },
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
                    include: {
                        listing: { include: { user: { include: { paymentDetails: true } } } },
                        user: true,
                        Transaction: { orderBy: { createdAt: "desc" } },
                    },
                }) as FullReservationPayload | null;
                if (refreshed) {
                    await this.triggerStatusNotifications(refreshed, 2, reason);
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
        listingId?: string;
        userId?: string;
        authorId?: string;
        status?: number;
    }): Promise<SafeReservation[]> {
        const { listingId, userId, authorId, status } = params;
        const query: Prisma.ReservationWhereInput = { markedForDeletion: false };

        if (listingId) query.listingId = listingId;
        if (userId) query.userId = userId;
        if (authorId) query.listing = { userId: authorId };
        if (status !== undefined) query.isApproved = status;

        const reservations = await prisma.reservation.findMany({
            where: query,
            include: { listing: true, user: true },
            orderBy: { createdAt: "desc" },
        });

        return reservations.map(r => this.normalizeReservation(r as FullReservationPayload));
    }

    private static normalizeReservation(r: FullReservationPayload): SafeReservation {
        return {
            ...r,
            createdAt: r.createdAt.toISOString(),
            startDate: r.startDate,
            startTime: r.startTime,
            endTime: r.endTime,
            markedForDeletionAt: r.markedForDeletionAt?.toISOString() || null,
            listing: {
                ...r.listing,
                createdAt: r.listing.createdAt.toISOString(),
            } as unknown as safeListing,
        };
    }

    static async checkUserBooking(userId: string, listingId: string) {
        const resv = await prisma.reservation.findFirst({
            where: { listingId, userId, isApproved: 1, markedForDeletion: false },
            orderBy: { createdAt: 'desc' },
            select: { id: true, startDate: true, startTime: true, endTime: true }
        });

        if (!resv) return null;

        const ymd = resv.startDate.toISOString().slice(0, 10);
        const parseHm = (label?: string | null): { h: number, m: number } | null => {
            if (!label) return null;
            const s = String(label);
            const m12 = s.match(/^\s*(\d{1,2}):(\d{2})\s*(AM|PM)\s*$/i);
            const m24 = s.match(/^\s*(\d{1,2}):(\d{2})\s*$/);
            if (m12) {
                let hh = parseInt(m12[1], 10);
                const mm = parseInt(m12[2], 10);
                const ap = m12[3].toUpperCase();
                if (ap === 'PM' && hh < 12) hh += 12;
                if (ap === 'AM' && hh === 12) hh = 0;
                return { h: hh, m: mm };
            }
            if (m24) return { h: parseInt(m24[1], 10), m: parseInt(m24[2], 10) };
            return null;
        };

        const hmEnd = parseHm(resv.endTime);
        const hmStart = parseHm(resv.startTime);
        let endAt: Date;

        if (hmEnd) endAt = new Date(`${ymd}T${String(hmEnd.h).padStart(2, '0')}:${String(hmEnd.m).padStart(2, '0')}:00`);
        else if (hmStart) endAt = new Date(`${ymd}T${String(hmStart.h).padStart(2, '0')}:${String(hmStart.m).padStart(2, '0')}:00`);
        else endAt = new Date(`${ymd}T23:59:00`);

        const now = new Date();
        const canReview = ymd < now.toISOString().slice(0, 10) || endAt.getTime() <= now.getTime();

        return { id: resv.id, canReview, status: canReview ? "PAID" : "UPCOMING", endAt: endAt.toISOString() };
    }
}
