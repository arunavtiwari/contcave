import { format } from "date-fns";

import { createOrderSplit } from "@/lib/cashfree/easySplit";
import { sendPayoutProcessedOwner } from "@/lib/email/templates";
import prisma from "@/lib/prismadb";
import { WhatsappService } from "@/lib/whatsapp/service";

function toErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
}

export class PayoutService {
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
                        isApproved: 1,
                        markedForDeletion: false,
                    }
                },
                vendorId: { not: null },
                cfOrderId: { not: null },
                payoutDueAt: { lte: now },
                OR: [
                    { payoutSplitAt: null },
                    { payoutSplitAt: { isSet: false } },
                ],
            },
            include: {
                reservation: {
                    include: {
                        listing: {
                            include: {
                                user: true,
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
                const payoutAmount =
                    txn.payoutAmountToOwner ??
                    Number((txn.amount * ((txn.payoutPercentToOwner ?? 88) / 100)).toFixed(2));

                if (!Number.isFinite(payoutAmount) || payoutAmount <= 0 || payoutAmount > txn.amount) {
                    throw new Error(`Invalid payout amount for transaction ${txn.id}`);
                }

                await createOrderSplit({
                    orderId: txn.cfOrderId!,
                    split: [{ vendor_id: txn.vendorId!, amount: payoutAmount }],
                    idempotencyKey: `split-${txn.id}`
                });

                const completedAt = new Date();
                await prisma.transaction.update({
                    where: { id: txn.id },
                    data: { payoutSplitAt: completedAt, payoutDoneAt: completedAt }
                });

                const owner = txn.reservation?.listing.user;
                const listingTitle = txn.reservation?.listing.title || "your studio";
                const bookingDate = txn.reservation?.startDate
                    ? format(txn.reservation.startDate, "dd MMM yyyy")
                    : format(completedAt, "dd MMM yyyy");

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
