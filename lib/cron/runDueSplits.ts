// lib/cron/runDueSplits.ts
import prisma from "@/lib/prismadb";
import { createOrderSplit } from "@/lib/cashfree/easySplit";

const OWNER_PAYOUT_PERCENT = Number(process.env.OWNER_PAYOUT_PERCENT || 80);

/**
 * Triggers Cashfree Easy Split for transactions due now.
 * Uses provider idempotency key per transaction.
 */
export async function runDueSplits(limit = 200) {
    const now = new Date();

    const txns = await prisma.transaction.findMany({
        where: {
            status: "SUCCESS",
            reservationId: { not: null },
            vendorId: { not: null },
            cfOrderId: { not: null },
            payoutDueAt: { lte: now }, // set to reservation start date in your webhook
        },
        orderBy: { payoutDueAt: "asc" },
        take: limit,
        select: {
            id: true,
            cfOrderId: true,
            vendorId: true,
            payoutPercentToOwner: true,
        },
    });

    const results: Array<{ id: string; ok: boolean; error?: string }> = [];

    for (const t of txns) {
        const orderId = String(t.cfOrderId || "");
        const vendorId = String(t.vendorId || "");
        if (!orderId || !vendorId) continue;

        const pct = Number.isFinite(t.payoutPercentToOwner as any)
            ? Math.max(0, Math.min(100, Number(t.payoutPercentToOwner)))
            : OWNER_PAYOUT_PERCENT;

        try {
            await createOrderSplit({
                orderId,
                split: [{ vendor_id: vendorId, percentage: pct }],
                idempotencyKey: `easy-split:${t.id}`,
            });
            results.push({ id: t.id, ok: true });
        } catch (e: any) {
            results.push({ id: t.id, ok: false, error: e?.message || "split failed" });
        }
    }

    return results;
}
