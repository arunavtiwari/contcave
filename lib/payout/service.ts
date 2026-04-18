

import { createOrderSplit } from "@/lib/cashfree/easySplit";
import prisma from "@/lib/prismadb";

export class PayoutService {
    /**
     * Orchestrate due split payouts for successful transactions.
     */
    static async processDueSplits(limit = 200): Promise<Array<{ id: string; ok: boolean; error?: string }>> {
        const now = new Date();
        const txns = await prisma.transaction.findMany({
            where: {
                status: "SUCCESS",
                reservationId: { not: null },
                vendorId: { not: null },
                cfOrderId: { not: null },
                payoutDueAt: { lte: now },
                payoutDoneAt: null,
            },
            take: limit
        });

        const results: Array<{ id: string; ok: boolean; error?: string }> = [];

        for (const txn of txns) {
            try {

                const pct = txn.payoutPercentToOwner || 80;

                await createOrderSplit({
                    orderId: txn.cfOrderId!,
                    split: [{ vendor_id: txn.vendorId!, percentage: pct }],
                    idempotencyKey: `split-${txn.id}`
                });

                await prisma.transaction.update({
                    where: { id: txn.id },
                    data: { payoutDoneAt: new Date() }
                });

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
