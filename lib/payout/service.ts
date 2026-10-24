
import { Prisma } from "@prisma/client";
import { formatInTimeZone } from "date-fns-tz";

import { createOrderSplit } from "@/lib/cashfree/easySplit";
import { sendPayoutProcessedOwner } from "@/lib/email/templates";
import { UserFacingError } from "@/lib/errors";
import { decryptPaymentDetailsInternal } from "@/lib/payment-details";
import prisma from "@/lib/prismadb";
import { formatReservationDate } from "@/lib/reservation/time";
import { auditService } from "@/lib/security/audit";
import { WhatsappService } from "@/lib/whatsapp/service";

function toErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
}

export class PayoutService {
    /**
     * Records an owner payout made outside the automatic split (e.g. a manual Cashfree transfer).
     * Setting payoutSplitAt takes the transaction out of processDueSplits for good, so it can't be
     * paid twice even after automatic payouts are switched back on.
     */
    static async markPaidManually(params: { transactionId: string; adminId: string; reference?: string | null; note?: string | null }) {
        const txn = await prisma.transaction.findUnique({
            where: { id: params.transactionId },
            select: { id: true, status: true, metadata: true, payoutSplitAt: true, payoutDoneAt: true },
        });
        if (!txn) throw new UserFacingError("Transaction not found", 404);
        if (txn.status !== "SUCCESS") throw new UserFacingError("Only successful payments can be paid out", 409);
        if (txn.payoutSplitAt || txn.payoutDoneAt) throw new UserFacingError("This payout is already marked as done", 409);

        const paidAt = new Date();
        const manualPayout = {
            paidAt: paidAt.toISOString(),
            markedBy: params.adminId,
            reference: params.reference?.trim() || null,
            note: params.note?.trim() || null,
        };
        const previousMetadata = txn.metadata && typeof txn.metadata === "object" && !Array.isArray(txn.metadata)
            ? (txn.metadata as Prisma.JsonObject)
            : {};

        const claimed = await prisma.transaction.updateMany({
            where: {
                id: txn.id,
                status: "SUCCESS",
                OR: [{ payoutSplitAt: null }, { payoutSplitAt: { isSet: false } }],
            },
            data: {
                payoutSplitAt: paidAt,
                payoutDoneAt: paidAt,
                payoutDueAt: null,
                metadata: { ...previousMetadata, manualPayout },
            },
        });
        if (claimed.count !== 1) throw new UserFacingError("This payout was processed by someone else just now", 409);

        await auditService.log({
            userId: params.adminId,
            action: "PAYOUT_MARKED_PAID_MANUALLY",
            resource: "Transaction",
            resourceId: txn.id,
            metadata: manualPayout,
        });
        return { transactionId: txn.id, paidAt: manualPayout.paidAt };
    }

    static async processDueSplits(limit = 200): Promise<Array<{ id: string; ok: boolean; error?: string }>> {
        const now = new Date();
        const splitSafeCreatedAt = new Date(now.getTime() - 2 * 60 * 1000);
        const txns = await prisma.transaction.findMany({
            where: {
                status: "SUCCESS",
                createdAt: { lte: splitSafeCreatedAt },
                reservationId: { not: null },
                reservation: {
                    is: {
                        markedForDeletion: false,
                        // Completed by the host or automatically after the slot ended (with or without a check-in).
                        OR: [
                            { status: "COMPLETED", completedAt: { not: null } },
                            { status: "NO_SHOW", noShowAt: { not: null } },
                        ],
                    }
                },
                cfOrderId: { not: null },
                payoutDueAt: { not: null, lte: now },
                OR: [{ payoutSplitAt: null }, { payoutSplitAt: { isSet: false } }],
            },
            include: {
                reservation: {
                    include: {
                        listing: {
                            include: {
                                user: { include: { paymentDetails: true } },
                            },
                        },
                    },
                },
            },
            take: limit
        });

        const results: Array<{ id: string; ok: boolean; error?: string }> = [];

        for (const txn of txns) {
            try {
                const stillEligible = await prisma.transaction.findFirst({
                    where: {
                        id: txn.id,
                        status: "SUCCESS",
                        OR: [{ payoutSplitAt: null }, { payoutSplitAt: { isSet: false } }],
                    },
                    select: { id: true },
                });
                if (!stillEligible) {
                    results.push({ id: txn.id, ok: true });
                    continue;
                }

                const payoutAmount =
                    txn.payoutAmountToOwner ??
                    Number((txn.amount * ((txn.payoutPercentToOwner ?? 88) / 100)).toFixed(2));

                if (!Number.isFinite(payoutAmount) || payoutAmount <= 0 || payoutAmount > txn.amount) {
                    throw new Error(`Invalid payout amount for transaction ${txn.id}`);
                }

                const ownerPaymentDetails = txn.reservation?.listing.user.paymentDetails;
                if (!ownerPaymentDetails) {
                    throw new Error(`Payout details are unavailable for transaction ${txn.id}`);
                }
                const vendorId = decryptPaymentDetailsInternal(ownerPaymentDetails).cashfreeVendorId?.trim();
                if (!vendorId) {
                    throw new Error(`Cashfree vendor is unavailable for transaction ${txn.id}`);
                }

                await createOrderSplit({
                    orderId: txn.cfOrderId!,
                    split: [{ vendor_id: vendorId, amount: payoutAmount }],
                    idempotencyKey: `split-${txn.id}`
                });

                const completedAt = new Date();
                const claimed = await prisma.transaction.updateMany({
                    where: {
                        id: txn.id,
                        status: "SUCCESS",
                        OR: [{ payoutSplitAt: null }, { payoutSplitAt: { isSet: false } }],
                    },
                    data: { payoutSplitAt: completedAt, payoutDoneAt: completedAt },
                });
                if (claimed.count !== 1) {
                    results.push({ id: txn.id, ok: true });
                    continue;
                }

                const owner = txn.reservation?.listing.user;
                const listingTitle = txn.reservation?.listing.title || "your studio";
                const bookingDate = txn.reservation?.startDate
                    ? formatReservationDate(txn.reservation.startDate)
                    : formatInTimeZone(completedAt, "Asia/Kolkata", "dd MMM yyyy");

                const notificationTasks: Array<Promise<unknown>> = [];

                if (owner?.email) {
                    notificationTasks.push(sendPayoutProcessedOwner({
                        toEmail: owner.email,
                        toName: owner.name || "Studio Owner",
                        studioName: listingTitle,
                        bookingId: txn.bookingId,
                        bookingDate,
                        payoutAmount,
                    }).catch((error) => {
                        console.error("[PayoutService] Payout email notification failed", {
                            txnId: txn.id,
                            error: toErrorMessage(error),
                        });
                    }));
                }

                if (owner?.phone) {
                    notificationTasks.push(WhatsappService.sendPaymentTransferredHost(owner.phone, {
                        hostName: owner.name || "Studio Owner",
                        amount: `Rs. ${payoutAmount.toFixed(2)}`,
                        listingTitle,
                        date: bookingDate,
                        idempotencyKey: `payout_host_${txn.id}`,
                    }).catch((error) => {
                        console.error("[PayoutService] Payout WhatsApp notification failed", {
                            txnId: txn.id,
                            error: toErrorMessage(error),
                        });
                    }));
                }

                if (notificationTasks.length > 0) {
                    await Promise.allSettled(notificationTasks);
                }

                results.push({ id: txn.id, ok: true });
                console.warn(`[PayoutService] Split processed for ${txn.id}`);
            } catch (error) {
                const message = error instanceof Error ? error.message : "Split failed";
                results.push({ id: txn.id, ok: false, error: message });
                console.error(`[PayoutService] Failed split for ${txn.id}:`, error);
            }
        }
        return results;
    }
}
