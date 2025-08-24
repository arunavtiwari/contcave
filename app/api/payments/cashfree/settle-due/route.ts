import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prismadb";
import { cfOnDemandTransfer } from "@/lib/cashfree";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest) {
    const now = new Date();

    const txns = await prisma.transaction.findMany({
        where: {
            status: "SUCCESS",
            payoutDueAt: { lte: now },
            payoutDoneAt: null,
            vendorId: { not: null },
        },
        take: 50,
    });

    let ok = 0, fail = 0;
    for (const t of txns) {
        try {
            const pct = t.payoutPercentToOwner ?? 80;
            const toVendor = Math.round((t.amount * pct) / 100);
            await cfOnDemandTransfer({
                vendor_id: t.vendorId!,
                amount: toVendor,
                transfer_id: `tr_${t.cfOrderId}`,
                remarks: `Payout for ${t.cfOrderId}`,
            });
            await prisma.transaction.update({
                where: { id: t.id },
                data: { payoutDoneAt: new Date() },
            });
            ok++;
        } catch (e) {
            console.error("Cashfree payout error", t.id, e);
            fail++;
        }
    }

    return NextResponse.json({ ok: true, processed: txns.length, succeeded: ok, failed: fail });
}
