import { Prisma } from "@prisma/client";
import crypto from "crypto";
import { NextRequest } from "next/server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { GST_RATE } from "@/constants/gst";
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";
import { checkSetConflicts, parseTimeToMinutes } from "@/lib/availability";
import { cfCreateOrder } from "@/lib/cashfree/cashfree";
import { getClientIp } from "@/lib/http/requestMeta";
import { calculateSetPricing, validateSetSelection } from "@/lib/pricing";
import prisma from "@/lib/prismadb";
import { asEndOfDayMinutes, labelToMinutes } from "@/lib/scheduling";
import { formatRetryAfterMs, rateLimit } from "@/lib/security/rateLimit";
import { TransactionService } from "@/lib/transaction/service";
import { getValidatedBaseUrl } from "@/lib/utils";
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

function sanitizeAddons(input: unknown): Array<{ qty: number; name?: string; id?: string }> {
    if (!input || typeof input !== 'object') return [];
    const arr = Array.isArray(input) ? input : Object.values(input);
    return arr
        .map((a: unknown) => {
            const item = a as { name?: string; id?: string; qty?: number };
            const quantity = Number(item?.qty ?? 0);
            return {
                name: typeof item?.name === "string" ? item.name.trim().slice(0, 100) : undefined,
                id: typeof item?.id === "string" ? item.id.trim().slice(0, 100) : undefined,
                qty: Number.isFinite(quantity) ? Math.floor(Math.max(0, Math.min(quantity, 100))) : 0,
            };
        })
        .filter((a) => a.qty > 0 && Boolean(a.id || a.name));
}

function buildBillingSnapshot(billing: {
    id: string;
    companyName: string;
    gstin: string;
    billingAddress: string;
} | null) {
    if (!billing) return null;
    return {
        id: billing.id,
        companyName: billing.companyName,
        gstin: billing.gstin,
        billingAddress: billing.billingAddress,
    };
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
    const endMin = asEndOfDayMinutes(labelToMinutes(params.endTime));

    if (!Number.isFinite(startMin) || !Number.isFinite(endMin)) {
        return "Please choose a valid start and end time.";
    }

    if (endMin <= startMin) {
        return "End time must be after start time.";
    }

    const durationMinutes = endMin - startMin;
    const configuredMinimumMinutes = Math.max(0, Number(params.minimumBookingHours || 0)) * 60;
    const minimumMinutes = configuredMinimumMinutes > 0 ? configuredMinimumMinutes : 90;
    if (minimumMinutes > 0 && durationMinutes < minimumMinutes) {
        const minimumHours = minimumMinutes / 60;
        return `Minimum booking duration is ${minimumHours} hour${minimumHours === 1 ? "" : "s"}.`;
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
        const rawCloseMin = labelToMinutes(typeof hours.end === "string" ? hours.end : "");
        const closeMin = asEndOfDayMinutes(rawCloseMin);
        const isAlwaysOpen = openMin === 0 && rawCloseMin === 0;

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

        const rawBody = await req.text();
        if (rawBody.length > 100_000) {
            return createErrorResponse("Request body too large", 413);
        }

        let raw: unknown;
        try {
            raw = JSON.parse(rawBody);
        } catch {
            return createErrorResponse("Invalid JSON body", 400);
        }
        const parsed = processPaymentSchema.safeParse(raw);
        if (!parsed.success) {
            return createErrorResponse("Invalid request", 400, { issues: parsed.error.issues });
        }
        const data = parsed.data;

        const currentUser = await getCurrentUser();
        if (!currentUser?.id) {
            return createErrorResponse("Unauthorized", 401);
        }

        const paymentLimit = rateLimit({
            key: `payment-order:${currentUser.id}:${getClientIp(req.headers)}`,
            limit: 10,
            windowMs: 60_000,
        });
        if (!paymentLimit.allowed) {
            const response = createErrorResponse("Too many payment attempts. Please wait and try again.", 429);
            response.headers.set("Retry-After", formatRetryAfterMs(paymentLimit.resetAt));
            return response;
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
        } else if (selectedSetIds.length > 0) {
            return createErrorResponse("Sets are not available for this listing", 400);
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
        const endMin = asEndOfDayMinutes(parseTimeToMinutes(data.endTime));
        const durationMinutes = endMin - startMin;

        let bookingFee = 0;
        let pricingBreakdown: unknown = null;

        if (selectedPackage || (listing.hasSets && listing.sets.length > 0)) {
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

        const requestedAddons = sanitizeAddons(data.selectedAddons);
        let addonsSum = 0;

        const listingAddons = Array.isArray(listing.addons)
            ? (listing.addons as Array<{ id?: string; name?: string; price?: number; qty?: number }>)
            : [];
        const selectedAddons = new Map<string, {
            id?: string;
            name: string;
            price: number;
            qty: number;
            maxAvailable: number;
        }>();

        for (const requested of requestedAddons) {
            const listingAddon = listingAddons.find((addon) =>
                requested.id
                    ? Boolean(addon.id && addon.id === requested.id)
                    : Boolean(addon.name && requested.name && addon.name.toLowerCase() === requested.name.toLowerCase())
            );
            if (!listingAddon?.name) {
                return createErrorResponse("One or more selected add-ons are no longer available", 409);
            }

            const unitPrice = Math.max(0, Number(listingAddon.price) || 0);
            const maxAvailable = listingAddon.qty === undefined || listingAddon.qty === null
                ? Number.POSITIVE_INFINITY
                : Math.max(0, Math.floor(Number(listingAddon.qty) || 0));
            const key = listingAddon.id || listingAddon.name.toLowerCase();
            const previous = selectedAddons.get(key);
            selectedAddons.set(key, {
                id: listingAddon.id,
                name: listingAddon.name,
                price: unitPrice,
                qty: (previous?.qty || 0) + requested.qty,
                maxAvailable,
            });
        }

        const cleanedAddons = Array.from(selectedAddons.values());
        for (const item of cleanedAddons) {
            const requestedQty = item.qty;
            const maxAvailable = item.maxAvailable;
            if (maxAvailable === 0) {
                return createErrorResponse(`Add-on "${item.name}" is currently unavailable`, 409);
            }
            if (Number.isFinite(maxAvailable) && requestedQty > maxAvailable) {
                return createErrorResponse(
                    `Add-on "${item.name}" only has ${maxAvailable} available, but ${requestedQty} were requested`,
                    409
                );
            }
            addonsSum += item.price * requestedQty;
        }
        const persistedAddons = cleanedAddons.map(({ maxAvailable: _maxAvailable, ...addon }) => addon);

        const platformFee = 0;
        const subTotal = bookingFee + addonsSum + platformFee;
        const gstAmount = Math.round(subTotal * GST_RATE);
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

        const billingRecord = data.billingDetailId
            ? await prisma.billingDetails.findFirst({
                where: {
                    id: data.billingDetailId,
                    userId: currentUser.id,
                },
                select: {
                    id: true,
                    companyName: true,
                    gstin: true,
                    billingAddress: true,
                },
            })
            : null;

        if (data.billingDetailId && !billingRecord) {
            return createErrorResponse("Billing details were not found for this account", 400);
        }

        const billingSnapshot = buildBillingSnapshot(billingRecord);

        const hash = hashPaymentInput({
            userId: currentUser.id,
            listingId: data.listingId,
            startDate: data.startDate,
            startTime: data.startTime,
            endTime: data.endTime,
            amount,
            billingDetailId: billingRecord?.id || null,
            billingSnapshot,
            setIds: selectedSetIds.sort(),
            setPackageId: data.setPackageId || null,
            selectedAddons: persistedAddons.map((addon) => ({
                id: addon.id || null,
                name: addon.name,
                price: addon.price,
                qty: addon.qty,
            })),
        });
        const baseTId = "tid_" + hash.slice(0, 16);
        const paymentSessionCutoff = new Date(Date.now() - 20 * 60_000);

        const existingTxn = await TransactionService.findLatestByRef(baseTId, currentUser.id);

        if (
            existingTxn?.status === "PENDING"
            && existingTxn.createdAt >= paymentSessionCutoff
            && existingTxn.cfPaymentSessionId
        ) {
            const mode = (process.env.CASHFREE_ENV || "SANDBOX").toLowerCase() === "production" ? "production" : "sandbox";

            return createSuccessResponse({
                tId: existingTxn.cfTxnRef,
                paymentSessionId: existingTxn.cfPaymentSessionId,
                mode,
                reused: true
            });
        }

        if (existingTxn?.status === "PENDING" && existingTxn.createdAt >= paymentSessionCutoff) {
            return createErrorResponse("Payment initialization is already in progress. Please wait a moment and try again.", 409);
        }
        if (existingTxn?.status === "SUCCESS") {
            return createErrorResponse("This booking payment has already been completed.", 409);
        }
        if (existingTxn?.status === "PENDING") {
            await TransactionService.updateStatus({ txnId: existingTxn.id, status: "EXPIRED" });
        }

        const tId = existingTxn
            ? `${baseTId}_${crypto.randomBytes(3).toString("hex")}`
            : baseTId;
        const transactionId = crypto.createHash("sha256").update(tId).digest("hex").slice(0, 24);

        const appUrl = getValidatedBaseUrl();

        let txn: Awaited<ReturnType<typeof TransactionService.create>>;
        try {
            txn = await TransactionService.create({
                id: transactionId,
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
                    selectedAddons: persistedAddons,
                    instantBooking: !!listing.instantBooking,
                    billingDetailId: billingRecord?.id || null,
                    billingSnapshot,
                    setIds: selectedSetIds,
                    setPackageId: data.setPackageId || null,
                    pricingSnapshot: pricingBreakdown || {
                        durationMinutes,
                        hourlyRate: Number(listing.price),
                        bookingFee,
                        addons: persistedAddons,
                        gstRate: GST_RATE,
                        gstAmount,
                        total: amount,
                    },
                },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
                const concurrentTxn = await TransactionService.findById(transactionId);
                if (concurrentTxn?.cfPaymentSessionId) {
                    const mode = (process.env.CASHFREE_ENV || "SANDBOX").toLowerCase() === "production" ? "production" : "sandbox";
                    return createSuccessResponse({
                        tId: concurrentTxn.cfTxnRef,
                        paymentSessionId: concurrentTxn.cfPaymentSessionId,
                        mode,
                        reused: true,
                    });
                }
                return createErrorResponse("Payment initialization is already in progress. Please wait a moment and try again.", 409);
            }
            throw error;
        }

        let order_id: string;
        let payment_session_id: string;

        try {
            if (process.env.E2E_ENABLE_CASHFREE_SIMULATOR === "true") {
                order_id = `e2e_order_${txn.id}`;
                payment_session_id = `e2e_session_${txn.id}`;
            } else {
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
                    expires_at: new Date(Date.now() + 20 * 60_000),
                });
                order_id = orderResult.order_id;
                payment_session_id = orderResult.payment_session_id;
            }
        } catch (orderError) {
            await TransactionService.fail(txn.id, `Payment initialization failed: ${orderError instanceof Error ? orderError.message : "Unknown error"}`).catch(() => { });
            throw orderError;
        }

        await TransactionService.updateSession(txn.id, payment_session_id, order_id);

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
