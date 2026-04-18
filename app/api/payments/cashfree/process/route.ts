import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";
import { checkSetConflicts, parseTimeToMinutes } from "@/lib/availability";
import { cfCreateOrder } from "@/lib/cashfree/cashfree";
import { calculateSetPricing } from "@/lib/pricing";
import prisma from "@/lib/prismadb";
import { TransactionService } from "@/lib/transaction/service";
import { processPaymentSchema } from "@/schemas/cashfree";
import { AdditionalSetPricingType, ListingSet } from "@/types/set";


type ListingWithSets = Prisma.ListingGetPayload<{
    include: { sets: true; packages: true };
}>;

function normalizePhone(phone?: string | null) {
    if (!phone) return null;
    const digits = phone.replace(/\D/g, "");
    const stripped = digits.startsWith("91") && digits.length === 12 ? digits.slice(2) : digits;
    return stripped.length === 10 ? stripped : null;
}

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

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    try {
        if (!req.headers.get("content-type")?.includes("application/json")) {
            return createErrorResponse("Content-Type must be application/json", 415);
        }

        const raw = await req.json();
        const parsed = processPaymentSchema.safeParse(raw);
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


        const listing = await prisma.listing.findUnique({
            where: { id: data.listingId },
            include: {
                sets: true,
                packages: true,
            }
        });

        if (!listing) {
            return createErrorResponse("Listing not found", 404);
        }


        if (listing.status !== "VERIFIED" || !listing.active) {
            return createErrorResponse("This listing is currently not accepting bookings", 400);
        }


        const selectedSetIds = data.setIds || [];
        const selectedPackage = data.setPackageId
            ? (listing as ListingWithSets).packages.find((p) => p.id === data.setPackageId && p.isActive)
            : null;

        if (data.setPackageId && !selectedPackage) {
            return createErrorResponse("Selected package is no longer available", 400);
        }


        const conflict = await checkSetConflicts({
            listingId: data.listingId,
            date: new Date(data.startDate),
            startTime: data.startTime,
            endTime: data.endTime,
            setIds: selectedSetIds,
        });

        if (conflict.hasConflict) {
            return createErrorResponse(conflict.conflictDetails || "One or more sets are no longer available for this time slot", 400);
        }

        const startMin = parseTimeToMinutes(data.startTime);
        const endMin = parseTimeToMinutes(data.endTime);
        let durationMinutes = endMin - startMin;
        if (durationMinutes <= 0) durationMinutes = 60;

        let bookingFee = 0;
        let pricingBreakdown: unknown = null;

        if (listing.hasSets && listing.sets.length > 0) {
            const setPricingType = listing.additionalSetPricingType as AdditionalSetPricingType || null;

            const setsForCalc = listing.sets.map(s => ({
                id: s.id,
                name: s.name,
                price: s.price,
                position: s.position
            })) as ListingSet[];

            const result = calculateSetPricing({
                baseHourlyRate: listing.price,
                durationMinutes,
                selectedSetIds,
                sets: setsForCalc,
                pricingType: setPricingType,
                selectedPackage: selectedPackage ? {
                    ...selectedPackage,
                    id: selectedPackage.id,
                    title: selectedPackage.title,
                    offeredPrice: selectedPackage.offeredPrice,
                    fixedAddOn: selectedPackage.fixedAddOn,
                    durationHours: selectedPackage.durationHours,
                    requiredSetCount: selectedPackage.requiredSetCount,
                    eligibleSetIds: selectedPackage.eligibleSetIds
                } : null,
            });
            bookingFee = result.subtotal;
            pricingBreakdown = result.breakdown;
        } else {
            const hours = Math.ceil(durationMinutes / 60);
            bookingFee = Number(listing.price) * hours;
        }

        const cleanedAddons = sanitizeAddons(data.selectedAddons);
        let addonsSum = 0;

        const listingAddons = Array.isArray(listing.addons)
            ? (listing.addons as Array<{ name?: string; price?: number; qty?: number }>)
            : [];

        for (const item of cleanedAddons) {
            let unitPrice = item.price;
            let maxAvailable = Infinity;
            const listingAddon = listingAddons.find(
                (a) => a.name && item.name && a.name.toLowerCase() === item.name.toLowerCase()
            );
            if (listingAddon) {
                unitPrice = Math.max(0, Number(listingAddon.price) || 0);
                if (listingAddon.qty !== undefined && listingAddon.qty !== null) {
                    maxAvailable = Math.max(0, Number(listingAddon.qty));
                }
            }

            const requestedQty = Math.max(0, item.qty || 1);
            if (maxAvailable === 0) {
                return createErrorResponse(`Addon "${item.name || "Unknown"}" is currently unavailable`, 400);
            }
            if (Number.isFinite(maxAvailable) && requestedQty > maxAvailable) {
                return createErrorResponse(
                    `Addon "${item.name || "Unknown"}" only has ${maxAvailable} available, but ${requestedQty} were requested`,
                    400
                );
            }

            unitPrice = Math.max(0, unitPrice);
            addonsSum += unitPrice * requestedQty;

            item.price = unitPrice;
            item.qty = requestedQty;
        }

        const platformFee = 0;
        const subTotal = bookingFee + addonsSum + platformFee;
        const gstRate = 0.18;
        const gstAmount = Math.round(subTotal * gstRate);
        const finalCalculatedAmount = Math.round(subTotal + gstAmount);

        const amount = finalCalculatedAmount;

        if (amount <= 0) {
            return createErrorResponse("Calculated amount is zero. Invalid booking parameters.", 400);
        }

        if (amount > 10000000) {
            return createErrorResponse("Amount exceeds maximum limit", 400);
        }

        const idempotencyKey = `${currentUser.id}:${data.listingId}:${startMin}:${endMin}:${amount}`;
        const hash = require("crypto").createHash("sha256").update(idempotencyKey).digest("hex");
        const tId = "tid_" + hash.slice(0, 16);

        const existingTxn = await TransactionService.findByRef(tId);

        if (existingTxn && existingTxn.cfPaymentSessionId) {
            return createSuccessResponse({
                tId: existingTxn.cfTxnRef,
                paymentSessionId: existingTxn.cfPaymentSessionId,
                reused: true
            });
        }

        const appUrl = process.env.NEXTAUTH_URL;
        if (!appUrl || typeof appUrl !== "string" || !appUrl.startsWith("http")) {
            return createErrorResponse("Server configuration error", 500);
        }

        const txn = await TransactionService.create({
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
                setIds: Array.isArray(data.setIds) ? data.setIds : [],
                setPackageId: data.setPackageId || null,
                pricingSnapshot: pricingBreakdown || data.pricingSnapshot || null,
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
            await TransactionService.fail(txn.id, `Payment initialization failed: ${orderError instanceof Error ? orderError.message : "Unknown error"}`).catch(() => { });
            throw orderError;
        }

        await TransactionService.updateSession(txn.id, payment_session_id, order_id).catch(() => { });

        const mode = (process.env.CASHFREE_ENV || "SANDBOX").toLowerCase() === "production" ? "production" : "sandbox";

        return createSuccessResponse({
            tId,
            paymentSessionId: payment_session_id,
            mode,
        });
    } catch (err: unknown) {
        if (err && typeof err === 'object' && 'name' in err && err.name === "ZodError") {
            return createErrorResponse("Invalid request", 400, (err as { issues?: Record<string, unknown> }).issues);
        }
        return handleRouteError(err, "POST /api/payments/cashfree/process");
    }
}
