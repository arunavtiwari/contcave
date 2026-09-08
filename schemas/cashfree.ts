import { z } from "zod";

import { TIME_SLOTS } from "@/constants/timeSlots";

export const toNum = (v: unknown) => (typeof v === "string" ? Number(v) : v);
export const trimStr = (v: unknown) => (typeof v === "string" ? v.trim() : v);
const normalizeTimeSlot = (v: unknown) => typeof v === "string" ? v.trim().replace(/\s+/g, " ").toUpperCase() : v;
const paymentTimeSlotSchema = z.preprocess(
    normalizeTimeSlot,
    z.enum(TIME_SLOTS as unknown as [string, ...string[]]),
);

export const ensureVendorSchema = z.object({
    userId: z.string()
});

export const processPaymentSchema = z.object({
    listingId: z.preprocess(trimStr, z.string().regex(/^[a-f\d]{24}$/i, "Invalid listing ID")),
    startDate: z
        .preprocess(trimStr, z.string().min(1, "startDate required"))
        .refine((s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s)), "startDate must be YYYY-MM-DD")
        .refine((s) => {
            const value = String(s);
            const parsed = new Date(`${value}T00:00:00.000Z`);
            return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
        }, "startDate is not a valid calendar date")
        .refine((s) => {
            const inputDate = new Date(String(s));
            const now = new Date();
            const istDate = new Date(now.getTime() + 330 * 60000);
            const today = new Date(Date.UTC(istDate.getUTCFullYear(), istDate.getUTCMonth(), istDate.getUTCDate()));
            return inputDate >= today;
        }, "Past dates are not allowed")
        .refine((s) => {
            const inputDate = new Date(String(s));
            const now = new Date();
            const istDate = new Date(now.getTime() + 330 * 60000);
            const latest = new Date(Date.UTC(istDate.getUTCFullYear(), istDate.getUTCMonth(), istDate.getUTCDate() + 90));
            return inputDate <= latest;
        }, "Bookings can be made up to 90 days in advance"),
    startTime: paymentTimeSlotSchema,
    endTime: paymentTimeSlotSchema,

    totalPrice: z.preprocess(toNum, z.number().positive("totalPrice must be > 0").max(10_000_000, "totalPrice exceeds limit")),
    selectedAddons: z.union([
        z.array(z.unknown()).max(50, "Too many add-ons selected"),
        z.record(z.string(), z.unknown()).refine((value) => Object.keys(value).length <= 50, "Too many add-ons selected"),
    ]).optional(),
    customerPhone: z.preprocess(trimStr, z.string().max(20).optional()),
    customerName: z.preprocess(trimStr, z.string().max(100).optional()),
    customerEmail: z.preprocess(trimStr, z.string().email().max(255).optional()),
    billingDetailId: z.preprocess(
        trimStr,
        z.string().regex(/^[a-f\d]{24}$/i, "billingDetailId must be a valid id").nullable().optional()
    ),

    setIds: z.array(z.string().regex(/^[a-f\d]{24}$/i, "Invalid set ID")).max(50).optional(),
    setPackageId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid package ID").nullable().optional(),
});

