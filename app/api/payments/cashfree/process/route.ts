import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prismadb";
import { randomUUID } from "crypto";
import { cfCreateOrder } from "@/lib/cashfree/cashfree";
import getCurrentUser from "@/app/actions/getCurrentUser";
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";

function normalizePhone(phone?: string | null) {
    if (!phone) return null;
    const digits = phone.replace(/\D/g, "");
    const stripped = digits.startsWith("91") && digits.length === 12 ? digits.slice(2) : digits;
    return stripped.length === 10 ? stripped : null;
}

const toNum = (v: unknown) => (typeof v === "string" ? Number(v) : v);
const trimStr = (v: unknown) => (typeof v === "string" ? v.trim() : v);

function sanitizeAddons(input: unknown): Array<{ price: number; qty?: number; name?: string; id?: string }> {
    if (!input || typeof input !== 'object') return [];
    const arr = Array.isArray(input) ? input : Object.values(input);
    return arr
        .map((a: unknown) => {
            const item = a as { name?: string; id?: string; price?: number; qty?: number };
            return {
                name: typeof item?.name === "string" ? item.name : undefined,
                id: typeof item?.id === "string" ? item.id : undefined,
                price: Math.max(0, Number(item?.price) || 0),
                qty: Math.max(0, Number(item?.qty ?? 0)),
            };
        })
        .filter((a) => a.price > 0 && a.qty > 0);
}

const Body = z.object({
    listingId: z.preprocess(trimStr, z.string().min(1, "listingId required")),
    startDate: z
        .preprocess(trimStr, z.string().min(1, "startDate required"))
        .refine((s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s)), "startDate must be YYYY-MM-DD")
        .refine((s) => {
            const inputDate = new Date(String(s));
            const now = new Date();
            const istDate = new Date(now.getTime() + 330 * 60000);
            const today = new Date(Date.UTC(istDate.getUTCFullYear(), istDate.getUTCMonth(), istDate.getUTCDate()));
            return inputDate >= today;
        }, "Past dates are not allowed"),
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
            return createErrorResponse("Content-Type must be application/json", 415);
        }

        const raw = await req.json();
        const parsed = Body.safeParse(raw);
        if (!parsed.success) {
            return createErrorResponse("Invalid request", 400, { issues: parsed.error.issues });
        }
        const data = parsed.data;

        const currentUser = await getCurrentUser();
        if (!currentUser?.id) {
            return createErrorResponse("Unauthorized", 401);
        }

        const customerPhone =
            normalizePhone(currentUser.phone) || normalizePhone(data.customerPhone) || null;
        if (!customerPhone) {
            return createErrorResponse("A valid 10-digit phone number is required (e.g., 9876543210).", 400);
        }

        const tId = "tid_" + randomUUID().replace(/-/g, "").slice(0, 20);
        const amount = Math.round(Number(data.totalPrice));
        
        if (amount <= 0 || !Number.isFinite(amount)) {
            return createErrorResponse("Invalid amount: must be a positive number", 400);
        }
        
        if (amount > 10000000) {
            return createErrorResponse("Amount exceeds maximum limit", 400);
        }
        
        const cleanedAddons = sanitizeAddons(data.selectedAddons);
        
        const appUrl = process.env.APP_URL;
        if (!appUrl || typeof appUrl !== "string" || !appUrl.startsWith("http")) {
            return createErrorResponse(
                "Server configuration error: APP_URL is missing or invalid",
                500
            );
        }

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

        let order_id: string;
        let payment_session_id: string;

        try {
            const customerName = (currentUser.name || data.customerName || "Customer").trim().slice(0, 100);
            const customerEmail = currentUser.email || data.customerEmail;
            
            if (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
                return createErrorResponse("Invalid email format", 400);
            }
            
            const orderResult = await cfCreateOrder({
                transaction_id: tId,
                order_amount: amount,
                customer_id: txn.userId,
                return_url: `${appUrl}/payments/cashfree/return?tid={transaction_id}`,
                notify_url: `${appUrl}/api/payments/cashfree/webhook`,
                customer_name: customerName,
                customer_email: customerEmail || undefined,
                customer_phone: customerPhone,
            });
            order_id = orderResult.order_id;
            payment_session_id = orderResult.payment_session_id;
        } catch (orderError) {
            await prisma.transaction.update({
                where: { id: txn.id },
                data: { 
                    status: "FAILED",
                    description: `Payment initialization failed: ${orderError instanceof Error ? orderError.message : "Unknown error"}`,
                },
            }).catch(() => {});

            const errorMessage = orderError instanceof Error 
                ? orderError.message 
                : "Failed to create payment order";
            
            if (errorMessage.includes("authentication") || errorMessage.includes("credentials")) {
                return createErrorResponse(
                    "Payment service configuration error. Please contact support.",
                    500,
                    process.env.NODE_ENV === "development" ? { details: errorMessage } : undefined
                );
            }

            throw orderError;
        }

        try {
            await prisma.transaction.update({
                where: { id: txn.id },
                data: { cfPaymentSessionId: payment_session_id, cfOrderId: order_id },
            });
        } catch (updateError) {
            if (process.env.NODE_ENV === "development") {
                console.error("[Cashfree Process] Failed to update transaction:", updateError);
            }
        }

        return createSuccessResponse({
            tId,
            paymentSessionId: payment_session_id,
        });
    } catch (err: unknown) {
        if (err && typeof err === 'object' && 'name' in err && err.name === "ZodError") {
            return createErrorResponse("Invalid request", 400, (err as { issues?: Record<string, unknown> }).issues);
        }
        return handleRouteError(err, "POST /api/payments/cashfree/process");
    }
}