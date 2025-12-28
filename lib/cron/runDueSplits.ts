import prisma from "@/lib/prismadb";
import { createOrderSplit } from "@/lib/cashfree/easySplit";
import { WhatsappService } from "@/lib/whatsapp/service";

const OWNER_PAYOUT_PERCENT = Number(process.env.OWNER_PAYOUT_PERCENT || 80);

export async function runDueSplits(limit = 200) {
    const now = new Date();

    const txns = await prisma.transaction.findMany({
        where: {
            status: "SUCCESS",
            reservationId: { not: null },
            vendorId: { not: null },
            cfOrderId: { not: null },
            payoutDueAt: { lte: now },
        },
        orderBy: { payoutDueAt: "asc" },
        take: limit,
        select: {
            id: true,
            cfOrderId: true,
            vendorId: true,
            payoutPercentToOwner: true,
            amount: true,
            listing: {
                select: {
                    title: true,
                    user: {
                        select: {
                            name: true,
                            phone: true,
                        }
                    }
                }
            }
        },
    });

    const results: Array<{ id: string; ok: boolean; error?: string }> = [];

    for (const t of txns) {
        const orderId = String(t.cfOrderId || "");
        const vendorId = String(t.vendorId || "");
        if (!orderId || !vendorId) continue;

        const pct = Number.isFinite(t.payoutPercentToOwner)
            ? Math.max(0, Math.min(100, Number(t.payoutPercentToOwner)))
            : OWNER_PAYOUT_PERCENT;

        try {
            await createOrderSplit({
                orderId,
                split: [{ vendor_id: vendorId, percentage: pct }],
                idempotencyKey: `easy-split:${t.id}`,
            });
            results.push({ id: t.id, ok: true });

            const hostPhone = t.listing?.user?.phone;
            if (hostPhone) {
                const payoutAmount = (Number(t.amount) * (pct / 100)).toFixed(2);
                try {
                    await WhatsappService.sendPaymentTransferredHost(hostPhone, {
                        hostName: t.listing?.user?.name || "Host",
                        amount: payoutAmount,
                        listingTitle: t.listing?.title || "Studio",
                        date: new Date().toISOString().split("T")[0],
                    });
                } catch (e: unknown) {
                    console.error("Failed to send payout WhatsApp", {
                        transactionId: t.id,
                        hostPhone,
                        error: e instanceof Error ? e.message : String(e),
                    });
                }
            }
        } catch (e: unknown) {
            results.push({ id: t.id, ok: false, error: e instanceof Error ? e.message : "split failed" });
        }
    }

    return results;
}
