import { Prisma } from "@prisma/client";
import { format } from "date-fns";

import { checkSetConflicts } from "@/lib/availability";
import { ensureCalendarEventForUser } from "@/lib/calendar/createEvent";
import { cfCreateRefund } from "@/lib/cashfree/cashfree";
import { sendReservationCustomerEmail } from "@/lib/email/reservationCustomer";
import { sendReservationOwnerEmail } from "@/lib/email/reservationOwner";
import { ensureInvoiceWithAttachment } from "@/lib/invoice/createInvoiceRecord";
import prisma from "@/lib/prismadb";
import { generateBookingId } from "@/lib/utils";
import { WhatsappService } from "@/lib/whatsapp/service";
import { safeListing } from "@/types/listing";
import { ReservationMetadata, ReservationResult } from "@/types/reservation";
import { SafeReservation } from "@/types/reservation";



type FullReservationPayload = Prisma.ReservationGetPayload<{
    include: {
        listing: { include: { user: true } };
        user: true;
        Transaction: { orderBy: { createdAt: "desc" } };
    };
}>;

export class ReservationService {
    /**
     * Create a reservation from a successful Cashfree transaction.
     * Handles conflict resolution, atomicity, GST mapping, and initial notifications.
     */
    static async createFromTransaction(txnId: string): Promise<ReservationResult | null> {
        return await prisma.$transaction(async (tx) => {
            const txn = await tx.transaction.findUnique({
                where: { id: txnId },
                include: {
                    listing: {
                        include: {
                            user: true,
                        }
                    },
                    user: true
                }
            });

            if (!txn || !txn.listing || !txn.userId) throw new Error("Transaction or listing not found");
            if (txn.reservationId) {
                return {
                    reservationId: txn.reservationId,
                    bookingId: txn.bookingId || "",
                    isInstant: !!txn.listing.instantBooking
                };
            }

            const md = (txn.metadata || {}) as unknown as ReservationMetadata;
            const startDate = md.startDate ? new Date(`${md.startDate}T00:00:00`) : new Date();
            const { startTime, endTime, setIds = [] } = md;

            // 1. Conflict Check & Auto-Refund
            const conflict = await checkSetConflicts({
                listingId: txn.listingId!,
                date: startDate,
                startTime,
                endTime,
                setIds,
            });

            if (conflict.hasConflict) {
                await cfCreateRefund({ order_id: txn.cfOrderId!, refund_amount: txn.amount, refund_id: `rf_auto_${txnId}`, refund_note: "Conflict resolution" });
                await tx.transaction.update({
                    where: { id: txnId },
                    data: { status: "FAILED", description: `Refunded: ${conflict.conflictDetails || "Slot taken"}` }
                });
                return null;
            }

            // 2. Booking ID
            const bookingId = await generateBookingId();

            // 3. Atomic Reservation Creation
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
                    selectedAddons: md.selectedAddons ? JSON.parse(md.selectedAddons) : null,
                    pricingSnapshot: md.pricingSnapshot ? JSON.parse(md.pricingSnapshot) : null,
                    isApproved: txn.listing.instantBooking ? 1 : 0, // 1=Approved, 0=Pending
                }
            });

            // 4. Update Transaction Ref
            await tx.transaction.update({
                where: { id: txnId },
                data: {
                    reservationId: reservation.id,
                    bookingId,
                    status: "SUCCESS"
                }
            });

            // 5. Invoicing & Notifications (Background-safe)
            const invoiceRes = await ensureInvoiceWithAttachment({
                userId: txn.userId,
                reservationId: reservation.id,
                transactionId: txn.id
            });
            const fullResv = await tx.reservation.findUnique({
                where: { id: reservation.id },
                include: { user: true, listing: { include: { user: true } }, Transaction: true }
            }) as FullReservationPayload;

            this.triggerInitialNotifications(fullResv as FullReservationPayload, invoiceRes.attachment);

            return {
                reservationId: reservation.id,
                bookingId,
                isInstant: !!txn.listing.instantBooking
            };
        });
    }

    private static async triggerInitialNotifications(resv: FullReservationPayload, invoiceAttachment: { filename: string; content: string } | undefined) {
        try {
            const txn = resv.Transaction[0];
            const listing = resv.listing;
            const md = (txn?.metadata || {}) as unknown as ReservationMetadata;

            const dateStr = format(resv.startDate, "dd MMM yyyy");


            const studioName = listing.title;
            const location = (listing.actualLocation as Record<string, unknown>)?.display_name as string || "";
            const addons = md.selectedAddons ? JSON.stringify(md.selectedAddons) : "None";

            // 1. Customer Email
            if (resv.user.email) {
                await sendReservationCustomerEmail({
                    toEmail: resv.user.email,
                    toName: resv.user.name || "Valued Customer",
                    studioName,
                    bookingId: resv.bookingId,
                    startDate: dateStr,
                    startTime: resv.startTime,
                    endTime: resv.endTime,
                    totalPrice: resv.totalPrice,
                    studioLocation: location,
                    addons,
                    attachments: invoiceAttachment ? [invoiceAttachment] : [],
                });
            }

            // 2. Owner Email
            if (listing.user.email) {
                await sendReservationOwnerEmail({
                    toEmail: listing.user.email,
                    toName: listing.user.name || "Studio Owner",
                    customerName: resv.user.name || "Customer",
                    studioName,
                    bookingId: resv.bookingId,
                    startDate: dateStr,
                    startTime: resv.startTime,
                    endTime: resv.endTime,
                    totalPrice: resv.totalPrice,
                });
            }

            // 3. WhatsApp (Customer)
            if (resv.user.phone) {
                if (listing.instantBooking) {
                    await WhatsappService.sendBookingConfirmedCustomer(resv.user.phone, {
                        customerName: resv.user.name || "Customer",
                        listingTitle: studioName,
                        startDate: dateStr,
                        startTime: resv.startTime,
                        locationLink: location || "https://maps.google.com",
                        idempotencyKey: `confirm_cust_${resv.id}`
                    });
                } else {
                    await WhatsappService.sendBookingReceivedCustomer(resv.user.phone, {
                        customerName: resv.user.name || "Customer",
                        listingTitle: studioName,
                        startDate: dateStr,
                        startTime: resv.startTime,
                        idempotencyKey: `receive_cust_${resv.id}`
                    });
                }
            }

            // 4. WhatsApp (Host)
            if (listing.user.phone) {
                await WhatsappService.sendBookingReceivedHost(listing.user.phone, {
                    hostName: listing.user.name || "Studio Owner",
                    customerName: resv.user.name || "Customer",
                    listingTitle: studioName,
                    startDate: dateStr,
                    startTime: resv.startTime,
                    idempotencyKey: `notify_host_${resv.id}`
                });
            }

            // 5. Calendar Sync
            await ensureCalendarEventForUser({
                userId: resv.userId,
                title: `Booking: ${studioName}`,
                startIso: new Date(`${format(resv.startDate, 'yyyy-MM-dd')}T${resv.startTime}:00`).toISOString(),
                endIso: new Date(`${format(resv.startDate, 'yyyy-MM-dd')}T${resv.endTime}:00`).toISOString(),
            });

        } catch (error) {
            console.error("[ReservationService] Notification loop failed:", error);
        }
    }

    static async updateStatus(reservationId: string, userId: string, status: number, reason?: string): Promise<void> {
        const resv = await prisma.reservation.findUnique({
            where: { id: reservationId },
            include: {
                listing: { include: { user: true } },
                user: true
            }
        });

        if (!resv) throw new Error("Reservation not found");

        const isHost = resv.listing.user.id === userId;
        const isCustomer = resv.userId === userId;

        if (!isHost && !isCustomer) throw new Error("Unauthorized");

        if (status === 1 || status === 0) {
            if (!isHost) throw new Error("Only hosts can approve/reject");
        }
        if (status === 3) {
            if (!isCustomer) throw new Error("Only customers can cancel");
        }

        await prisma.reservation.update({
            where: { id: reservationId },
            data: { isApproved: status, rejectReason: reason || null }
        });

        // Trigger notifications for status change
        this.triggerStatusNotifications(resv as FullReservationPayload, status, reason);
    }

    private static async triggerStatusNotifications(resv: FullReservationPayload, status: number, reason?: string) {
        try {
            const dateStr = format(resv.startDate, "dd MMM yyyy");
            const timeStr = `${resv.startTime} to ${resv.endTime}`;

            if (status === 1 && resv.user.phone) {
                await WhatsappService.sendBookingConfirmedCustomer(resv.user.phone, {
                    customerName: resv.user.name || "Customer",
                    listingTitle: resv.listing.title,
                    startDate: dateStr,
                    startTime: timeStr,
                    locationLink: "https://maps.google.com"
                });
            } else if (status === 0 && resv.user.phone) {
                await WhatsappService.sendBookingRejectedCustomer(resv.user.phone, {
                    customerName: resv.user.name || "Customer",
                    listingTitle: resv.listing.title,
                    rejectReason: reason || "Not specified"
                });
            } else if (status === 3 && resv.listing.user.phone) {
                await WhatsappService.sendBookingCancelledHost(resv.listing.user.phone, {
                    hostName: resv.listing.user.name || "Host",
                    customerName: resv.user.name || "Customer",
                    listingTitle: resv.listing.title,
                    startDate: dateStr
                });
            }
        } catch (e) {
            console.error("[ReservationService] status notification failed", e);
        }
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
                if (newStatus !== "PENDING") {
                    const updatedTxn = await prisma.transaction.update({
                        where: { id: txn.id },
                        data: { status: newStatus },
                        include: { reservation: { include: { listing: true } }, listing: true, user: true }
                    });

                    if (newStatus === "SUCCESS") {
                        await this.createFromTransaction(txn.id);
                    } else if (newStatus === "FAILED") {
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
            const { sendTemplateEmail } = await import("@/lib/email/mailer");
            await prisma.transaction.update({
                where: { id: txnId },
                data: { emailSentFailed: true }
            });

            await sendTemplateEmail({
                toEmail: txn.user.email,
                toName: txn.user.name || "Customer",
                templateId: process.env.MS_TPL_RESERVATION_FAILED || "",
                data: {
                    customer_name: txn.user.name || "Customer",
                    order_id: txn.cfOrderId || "N/A"
                }
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
    }

    /**
     * Cron-driven Booking Reminders
     */
    static async sendReminders(rangeStart: Date, rangeEnd: Date): Promise<Array<{ id: string; status: string; error?: string }>> {
        const reservations = await prisma.reservation.findMany({
            where: {
                startDate: { gte: rangeStart, lte: rangeEnd },
                reminderSent: false,
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

    /**
     * Unified Reservation Retrieval
     */
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

    /**
     * Check if a user has a valid booking and determine if they can review.
     */
    static async checkUserBooking(userId: string, listingId: string) {
        const resv = await prisma.reservation.findFirst({
            where: { listingId, userId },
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
