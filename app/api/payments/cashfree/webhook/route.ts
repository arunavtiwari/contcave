import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prismadb";
import { cfVerifyWebhookSignature } from "@/lib/cashfree";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const IS_PROD = process.env.NODE_ENV === "production";
const STRICT_VERIFY = IS_PROD;

const log = {
    info: (...a: unknown[]) => console.log("[CF-WH]", ...a),
    warn: (...a: unknown[]) => console.warn("[CF-WH]", ...a),
    error: (...a: unknown[]) => console.error("[CF-WH]", ...a),
};

async function retry<T>(fn: () => Promise<T>, tries = 3, ms = 120): Promise<T> {
    let lastErr: any;
    for (let i = 0; i < tries; i++) {
        try {
            return await fn();
        } catch (e: any) {
            lastErr = e;
            await new Promise(r => setTimeout(r, ms * (i + 1)));
        }
    }
    throw lastErr;
}

function mapTxnStatus(input?: string): "SUCCESS" | "FAILED" | "CANCELLED" | "EXPIRED" | "PENDING" {
    const v = String(input || "").toUpperCase();
    if (v === "PAID" || v === "SUCCESS" || v === "CAPTURED") return "SUCCESS";
    if (v === "FAILED") return "FAILED";
    if (v === "CANCELLED") return "CANCELLED";
    if (v === "EXPIRED") return "EXPIRED";
    return "PENDING";
}

function pickOrderId(payload: any): string {
    return String(payload?.data?.order?.order_id ?? "");
}
function pickPaymentStatus(payload: any): string {
    return String(payload?.data?.payment?.payment_status ?? "");
}
function pickPaymentId(payload: any): string | undefined {
    const raw = payload?.data?.payment?.cf_payment_id;
    return raw != null ? String(raw) : undefined;
}

function buildSlotDates(startDateISO?: string, startHHmm?: string, endHHmm?: string) {
    const startBase = new Date(startDateISO || Date.now());
    const yyyyMmDd = startBase.toISOString().slice(0, 10);
    const norm = (hhmm?: string) => (/^\d{2}:\d{2}$/.test(String(hhmm)) ? String(hhmm) : "00:00");
    const startIso = `${yyyyMmDd}T${norm(startHHmm)}:00.000Z`;
    const endIso = `${yyyyMmDd}T${norm(endHHmm)}:00.000Z`;
    return { startDate: startBase, startTime: new Date(startIso), endTime: new Date(endIso) };
}

export async function POST(req: NextRequest) {
    const t0 = Date.now();

    let raw = "";
    try {
        raw = await req.text();
    } catch (e) {
        log.error("read body failed:", (e as Error)?.message);
        return NextResponse.json({ ok: true }, { status: 200 });
    }

    const timestamp = req.headers.get("x-webhook-timestamp") || "";
    const signature = req.headers.get("x-webhook-signature") || "";
    let verified = false;
    try {
        if (timestamp && signature) {
            verified = cfVerifyWebhookSignature({ rawBody: raw, timestamp, signatureBase64: signature });
        }
    } catch (e) {
        log.warn("verify threw:", (e as Error)?.message);
    }
    if (STRICT_VERIFY && !verified) {
        return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
    }

    let payload: any = null;
    try {
        payload = JSON.parse(raw);
    } catch {
        log.warn("invalid json body");
        return NextResponse.json({ ok: true }, { status: 200 });
    }

    const rId = pickOrderId(payload);
    if (!rId) {
        log.warn("missing order_id; acking");
        return NextResponse.json({ ok: true }, { status: 200 });
    }
    const cfPaymentId = pickPaymentId(payload);
    const status = mapTxnStatus(pickPaymentStatus(payload));

    try {
        const txn = await retry(() =>
            prisma.transaction.findFirst({
                where: { cfOrderId: rId },
                select: {
                    id: true,
                    status: true,
                    reservationId: true,
                    userId: true,
                    listingId: true,
                    amount: true,
                    metadata: true,
                },
            })
        );

        if (!txn) {
            log.warn("txn not found for order", rId);
            return NextResponse.json({ ok: true }, { status: 200 });
        }

        await retry(() =>
            prisma.transaction.update({
                where: { id: txn.id },
                data: {
                    status,
                    cfPaymentId,
                    cfWebhookPayload: payload,
                    cfSignature: signature || undefined,
                },
            })
        );

        if (status === "SUCCESS" && !txn.reservationId && txn.userId && txn.listingId) {
            const listing = await retry(() =>
                prisma.listing.findUnique({
                    where: { id: txn.listingId! },
                    include: { user: { include: { paymentDetails: true } } },
                })
            );

            const isInstant = listing?.instantBooking;
            const md: any = txn.metadata || {};
            const { startDate, startTime, endTime } = buildSlotDates(md.startDate, md.startTime, md.endTime);

            const reservation = await retry(() =>
                prisma.reservation.create({
                    data: {
                        userId: txn.userId!,
                        listingId: txn.listingId!,
                        startDate,
                        startTime,
                        endTime,
                        totalPrice: txn.amount,
                        selectedAddons: md.selectedAddons ?? null,
                        isApproved: isInstant ? 1 : 0,
                        Transaction: { connect: { id: txn.id } },
                    },
                    select: { id: true },
                })
            );

            const vendorId = listing?.user?.paymentDetails?.cashfreeVendorId || null;
            const payoutDueAt = new Date(Date.now() + 7 * 24 * 3600 * 1000);

            await retry(() =>
                prisma.transaction.update({
                    where: { id: txn.id },
                    data: {
                        reservationId: reservation.id,
                        vendorId: vendorId || undefined,
                        payoutPercentToOwner: 80,
                        payoutDueAt,
                    },
                })
            );
        }
    } catch (e) {
        log.error("db error:", (e as Error)?.message);
    } finally {
        const ms = Date.now() - t0;
        if (ms > 1500) log.warn("slow webhook", { ms });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
}
