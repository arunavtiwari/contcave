import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prismadb";
import { randomUUID } from "crypto";
import { cfCreateOrder } from "@/lib/cashfree";
import getCurrentUser from "@/app/actions/getCurrentUser";

function normalizePhone(phone?: string | null) {
    if (!phone) return null;
    const digits = phone.replace(/\D/g, "");
    const stripped = digits.startsWith("91") && digits.length === 12 ? digits.slice(2) : digits;
    return stripped.length === 10 ? stripped : null;
}

const toNum = (v: unknown) => (typeof v === "string" ? Number(v) : v);
const trimStr = (v: unknown) => (typeof v === "string" ? v.trim() : v);

function sanitizeAddons(input: any): Array<{ price: number; qty?: number; name?: string; id?: string }> {
    if (!input) return [];
    const arr = Array.isArray(input) ? input : Object.values(input);
    return arr
        .map((a: any) => ({
            name: typeof a?.name === "string" ? a.name : undefined,
            id: typeof a?.id === "string" ? a.id : undefined,
            price: Math.max(0, Number(a?.price) || 0),
            qty: Math.max(0, Number(a?.qty ?? 0)),
        }))
        .filter((a) => a.price > 0 && a.qty > 0);
}

const Body = z.object({
    listingId: z.preprocess(trimStr, z.string().min(1, "listingId required")),
    startDate: z
        .preprocess(trimStr, z.string().min(1, "startDate required"))
        .refine((s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s)), "startDate must be YYYY-MM-DD"),
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

        const currentUser = await getCurrentUser();
        if (!currentUser?.id) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const customerPhone =
            normalizePhone(currentUser.phone) || normalizePhone(data.customerPhone) || null;
        if (!customerPhone) {
            return NextResponse.json(
                { message: "A valid 10-digit phone number is required (e.g., 9876543210)." },
                { status: 400 }
            );
        }

        const tId = "tid_" + randomUUID().replace(/-/g, "").slice(0, 20);
        const amount = Math.round(Number(data.totalPrice));
        const cleanedAddons = sanitizeAddons(data.selectedAddons);

        const txn = await prisma.transaction.create({
            data: {
                userId: currentUser.id,
                listingId: data.listingId,
                amount,
                currency: "INR",
                status: "PENDING",
                description: "Listing reservation",
                paymentMethod: "Cashfree",
                cfTxnRef: tId,
                metadata: {
                    startDate: data.startDate,
                    startTime: data.startTime,
                    endTime: data.endTime,
                    selectedAddons: cleanedAddons,
                    instantBooking: !!data.instantBooking,
                },
            },
        });

        const { order_id, payment_session_id } = await cfCreateOrder({
            transaction_id: tId,
            order_amount: amount,
            customer_id: txn.userId,
            return_url: `${process.env.APP_URL}/payments/cashfree/return?tid={transaction_id}`,
            notify_url: `${process.env.APP_URL}/api/payments/cashfree/webhook`,
            customer_name: currentUser.name || data.customerName || "Customer",
            customer_email: currentUser.email || data.customerEmail || undefined,
            customer_phone: customerPhone,
        });

        await prisma.transaction.update({
            where: { id: txn.id },
            data: { cfPaymentSessionId: payment_session_id, cfOrderId: order_id },
        });

        return NextResponse.json({
            tId,
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