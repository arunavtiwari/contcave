import { Prisma } from "@prisma/client";
import crypto from "crypto";
import { NextRequest } from "next/server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";
import { checkSetConflicts, parseTimeToMinutes } from "@/lib/availability";
import { cfCreateOrder } from "@/lib/cashfree/cashfree";
import { calculateSetPricing, validateSetSelection } from "@/lib/pricing";
import prisma from "@/lib/prismadb";
import { labelToMinutes } from "@/lib/scheduling";
import { TransactionService } from "@/lib/transaction/service";
import { getBaseUrl } from "@/lib/utils";
import { processPaymentSchema } from "@/schemas/cashfree";
import { AdditionalSetPricingType, ListingSet } from "@/types/set";


type ListingWithSets = Prisma.ListingGetPayload<{
    include: { sets: true; packages: true };
}>;

function stableStringify(value: unknown): string {
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
    if (value && typeof value === "object") {
        return `{${Object.entries(value as Record<string, unknown>)
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
            .join(",")}}`;
    }
    return JSON.stringify(value);
}

function hashPaymentInput(input: Record<string, unknown>): string {
    return crypto.createHash("sha256").update(stableStringify(input)).digest("hex");
}

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

const dayKeys = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const configuredDayOrder = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getBookingDate(date: string) {
    return new Date(`${date}T00:00:00.000Z`);
}

function getBookingDayKey(date: string) {
    return dayKeys[new Date(`${date}T12:00:00+05:30`).getUTCDay()];
}

function isOperationalDay(operationalDays: unknown, date: string) {
    const day = getBookingDayKey(date);
    if (!operationalDays || typeof operationalDays !== "object" || Array.isArray(operationalDays)) return true;
    const days = operationalDays as { days?: unknown[]; start?: unknown; end?: unknown };

    if (Array.isArray(days.days)) {
        return days.days.map(String).includes(day);
    }

    const start = typeof days.start === "string" ? days.start : "Mon";
    const end = typeof days.end === "string" ? days.end : "Sun";
    const startIndex = configuredDayOrder.indexOf(start);
    const endIndex = configuredDayOrder.indexOf(end);
    const currentIndex = configuredDayOrder.indexOf(day);

    if (startIndex < 0 || endIndex < 0 || currentIndex < 0) return true;
    if (startIndex <= endIndex) return currentIndex >= startIndex && currentIndex <= endIndex;
    return currentIndex >= startIndex || currentIndex <= endIndex;
}

function validateBookingWindow(params: {
    startDate: string;
    startTime: string;
    endTime: string;
    operationalDays: unknown;
    operationalHours: unknown;
    minimumBookingHours?: number | null;
    selectedPackageDurationHours?: number | null;
}) {
    const startMin = labelToMinutes(params.startTime);
    const endMin = labelToMinutes(params.endTime);

    if (!Number.isFinite(startMin) || !Number.isFinite(endMin)) {
        return "Please choose a valid start and end time.";
    }

    if (endMin <= startMin) {
        return "End time must be after start time.";
    }

    const durationMinutes = endMin - startMin;
    const minimumMinutes = Math.max(0, Number(params.minimumBookingHours || 0)) * 60;
    if (minimumMinutes > 0 && durationMinutes < minimumMinutes) {
        return `Minimum booking duration is ${params.minimumBookingHours} hour${params.minimumBookingHours === 1 ? "" : "s"}.`;
    }

    const packageMinutes = Math.max(0, Number(params.selectedPackageDurationHours || 0)) * 60;
    if (packageMinutes > 0 && durationMinutes !== packageMinutes) {
        return "Selected time slot must match the package duration.";
    }

    if (!isOperationalDay(params.operationalDays, params.startDate)) {
        return "This studio is not operational on the selected date.";
    }

    if (params.operationalHours && typeof params.operationalHours === "object" && !Array.isArray(params.operationalHours)) {
        const hours = params.operationalHours as { start?: unknown; end?: unknown };
        const openMin = labelToMinutes(typeof hours.start === "string" ? hours.start : "");
        const closeMin = labelToMinutes(typeof hours.end === "string" ? hours.end : "");
        const isAlwaysOpen = openMin === 0 && closeMin === 0;

        if (!isAlwaysOpen && Number.isFinite(openMin) && Number.isFinite(closeMin)) {
            if (closeMin <= openMin) {
                return "This studio's operational hours are not configured correctly.";
            }
            if (startMin < openMin || endMin > closeMin) {
                return "Selected time slot is outside this studio's operational hours.";
            }
        }
    }

    const now = new Date();
    const slotStart = new Date(`${params.startDate}T${String(Math.floor(startMin / 60)).padStart(2, "0")}:${String(startMin % 60).padStart(2, "0")}:00+05:30`);
    if (slotStart.getTime() <= now.getTime()) {
        return "Past time slots are not available for booking.";
    }

    return null;
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


        const selectedSetIds = Array.from(new Set((data.setIds || []).map((id) => id.trim()).filter(Boolean)));
        const selectedPackage = data.setPackageId
            ? (listing as ListingWithSets).packages.find((p) => p.id === data.setPackageId && p.isActive)
            : null;

        if (data.setPackageId && !selectedPackage) {
            return createErrorResponse("Selected package is no longer available", 400);
        }

        const windowError = validateBookingWindow({
            startDate: data.startDate,
            startTime: data.startTime,
            endTime: data.endTime,
            operationalDays: listing.operationalDays,
            operationalHours: listing.operationalHours,
            minimumBookingHours: listing.minimumBookingHours,
            selectedPackageDurationHours: selectedPackage?.durationHours ?? null,
        });

        if (windowError) {
            return createErrorResponse(windowError, 400);
        }

        const dayStatus = await prisma.dayStatus.findUnique({
            where: {
                listingId_date: {
                    listingId: data.listingId,
                    date: getBookingDate(data.startDate),
                }
            }
        });

        if (dayStatus) {
            if (!dayStatus.listingActive) {
                return createErrorResponse("This studio is not accepting bookings on the selected date", 400);
            }

            const overrideError = validateBookingWindow({
                startDate: data.startDate,
                startTime: data.startTime,
                endTime: data.endTime,
                operationalDays: listing.operationalDays,
                operationalHours: { start: dayStatus.startTime, end: dayStatus.endTime },
                minimumBookingHours: listing.minimumBookingHours,
                selectedPackageDurationHours: selectedPackage?.durationHours ?? null,
            });

            if (overrideError) {
                return createErrorResponse(overrideError, 400);
            }
        }

        if (listing.hasSets) {
            if (selectedSetIds.length === 0) {
                return createErrorResponse("Select at least one set for this listing", 400);
            }

            const validSetIds = new Set(listing.sets.map((set) => set.id));
            const invalidSetIds = selectedSetIds.filter((id) => !validSetIds.has(id));
            if (invalidSetIds.length > 0) {
                return createErrorResponse("One or more selected sets are invalid for this listing", 400);
            }

            const selection = validateSetSelection(selectedSetIds, selectedPackage);
            if (!selection.valid) {
                return createErrorResponse(selection.error || "Invalid set selection", 400);
            }
        } else if (selectedSetIds.length > 0 || selectedPackage) {
            return createErrorResponse("Sets and packages are not available for this listing", 400);
        }


        const conflict = await checkSetConflicts({
            listingId: data.listingId,
            date: getBookingDate(data.startDate),
            startTime: data.startTime,
            endTime: data.endTime,
            setIds: selectedSetIds,
        });

        if (conflict.hasConflict) {
            return createErrorResponse(conflict.conflictDetails || "One or more sets are no longer available for this time slot", 400);
        }

        const startMin = parseTimeToMinutes(data.startTime);
        const endMin = parseTimeToMinutes(data.endTime);
        const durationMinutes = endMin - startMin;

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
                baseHourlyRate: listing.price ?? 0,
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

        if (Math.abs(Number(data.totalPrice) - amount) > 1) {
            return createErrorResponse("Booking price changed. Please refresh the page and try again.", 409);
        }

        if (amount <= 0) {
            return createErrorResponse("Calculated amount is zero. Invalid booking parameters.", 400);
        }

        if (amount > 10000000) {
            return createErrorResponse("Amount exceeds maximum limit", 400);
        }

        const hash = hashPaymentInput({
            userId: currentUser.id,
            listingId: data.listingId,
            startDate: data.startDate,
            startTime: data.startTime,
            endTime: data.endTime,
            amount,
            setIds: selectedSetIds.sort(),
            setPackageId: data.setPackageId || null,
            selectedAddons: cleanedAddons.map((addon) => ({
                id: addon.id || null,
                name: addon.name || null,
                price: addon.price,
                qty: addon.qty || 0,
            })),
        });
        const baseTId = "tid_" + hash.slice(0, 16);

        const existingTxn = await TransactionService.findByRef(baseTId);

        if (existingTxn && existingTxn.cfPaymentSessionId) {
            const mode = (process.env.CASHFREE_ENV || "SANDBOX").toLowerCase() === "production" ? "production" : "sandbox";

            return createSuccessResponse({
                tId: existingTxn.cfTxnRef,
                paymentSessionId: existingTxn.cfPaymentSessionId,
                mode,
                reused: true
            });
        }

        const tId = await TransactionService.hasAnyRef(baseTId)
            ? `${baseTId}_${Date.now().toString(36)}`
            : baseTId;

        const appUrl = new URL(req.url).origin || getBaseUrl();
        if (!appUrl.startsWith("http")) {
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
                setIds: selectedSetIds,
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
                return_url: `${appUrl}/api/payments/cashfree/return?tid={transaction_id}`,
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
