import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prismadb";
import { randomUUID } from "crypto";
import { cfCreateOrder } from "@/lib/cashfree";
import getCurrentUser from "@/app/actions/getCurrentUser";

/** ----------------- Helpers ----------------- **/

function normalizeTimeLabel(label: unknown): string | null {
    if (!label) return null;
    const s = String(label).trim();
    const m = s.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);
    if (!m) return null;

    let h = Number(m[1]);
    const min = Number(m[2]);
    const ampm = m[3].toUpperCase();

    if (min < 0 || min > 59 || h < 1 || h > 12) return null;

    if (ampm === "AM") {
        if (h === 12) h = 0;
    } else {
        if (h !== 12) h += 12;
    }
    return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function normalizePhone(phone?: string | null) {
    if (!phone) return null;
    const digits = phone.replace(/\D/g, "");
    const stripped = digits.startsWith("91") && digits.length === 12 ? digits.slice(2) : digits;
    return stripped.length === 10 ? stripped : null;
}

const toNum = (v: unknown) => (typeof v === "string" ? Number(v) : v);
const trimStr = (v: unknown) => (typeof v === "string" ? v.trim() : v);

/** ----------------- Schema ----------------- **/

const Body = z.object({
    listingId: z.preprocess(trimStr, z.string().min(1, "listingId required")),
    startDate: z
        .preprocess(trimStr, z.string().min(1, "startDate required"))
        .refine((s) => !Number.isNaN(new Date(String(s)).getTime()), "startDate must be a valid date"),
    startTime: z.preprocess(trimStr, z.string().min(1, "startTime required")),
    endTime: z.preprocess(trimStr, z.string().min(1, "endTime required")),

    totalPrice: z.preprocess(toNum, z.number().positive("totalPrice must be > 0")),
    selectedAddons: z.any().optional(),
    instantBooking: z.boolean().default(false),

    customerPhone: z.preprocess(trimStr, z.string().optional()),
    customerName: z.preprocess(trimStr, z.string().optional()),
    customerEmail: z.preprocess(trimStr, z.string().email().optional()),
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** ----------------- Handler ----------------- **/

export async function POST(req: NextRequest) {
    try {
        if (!req.headers.get("content-type")?.includes("application/json")) {
            return NextResponse.json({ message: "Content-Type must be application/json" }, { status: 415 });
        }

        const raw = await req.json();
        const parsed = Body.safeParse(raw);
        if (!parsed.success) {
            return NextResponse.json({ message: "Invalid request", issues: parsed.error.issues }, { status: 400 });
        }
        const data = parsed.data;

        const normStart = normalizeTimeLabel(data.startTime);
        const normEnd = normalizeTimeLabel(data.endTime);
        if (!normStart || !normEnd) {
            return NextResponse.json(
                { message: "Invalid time format. Must match one of the predefined slots like '6:00 AM', '12:30 PM'." },
                { status: 400 }
            );
        }

        const currentUser = await getCurrentUser();
        if (!currentUser?.id) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const customerPhone =
            normalizePhone(currentUser.phone) || normalizePhone(data.customerPhone) || null;
        if (!customerPhone) {
            return NextResponse.json(
                {
                    message:
                        "A valid 10-digit phone number is required. Add your phone in profile or pass `customerPhone` (e.g., 9876543210).",
                },
                { status: 400 }
            );
        }

        const rId = "rid_" + randomUUID().replace(/-/g, "").slice(0, 20);
        const amount = Math.round(Number(data.totalPrice));

        const txn = await prisma.transaction.create({
            data: {
                userId: currentUser.id,
                listingId: data.listingId,
                amount,
                currency: "INR",
                status: "PENDING",
                description: "Listing reservation",
                paymentMethod: "Cashfree",
                cfOrderId: rId,
                metadata: {
                    startDate: data.startDate,
                    startTime: normStart,
                    endTime: normEnd,
                    selectedAddons: data.selectedAddons ?? null,
                    instantBooking: data.instantBooking ?? false,
                },
            },
        });

        const { payment_session_id } = await cfCreateOrder({
            reservation_id: rId,
            order_amount: amount,
            customer_id: txn.userId,
            return_url: `${process.env.APP_URL}/payments/cashfree/return?rid={reservation_id}`,
            notify_url: `${process.env.APP_URL}/api/payments/cashfree/webhook`,
            customer_name: currentUser.name || data.customerName || "Customer",
            customer_email: currentUser.email || data.customerEmail || undefined,
            customer_phone: customerPhone,
        });

        await prisma.transaction.update({
            where: { id: txn.id },
            data: { cfPaymentSessionId: payment_session_id },
        });

        return NextResponse.json({
            rId,
            paymentSessionId: payment_session_id,
        });
    } catch (err: any) {
        if (err?.name === "ZodError") {
            return NextResponse.json({ message: "Invalid request", issues: err.issues }, { status: 400 });
        }
        console.error("cashfree:create-reservation error", err);
        return NextResponse.json({ message: err?.message || "Internal Server Error" }, { status: 500 });
    }
}
