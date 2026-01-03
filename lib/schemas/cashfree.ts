import { z } from "zod";

export const toNum = (v: unknown) => (typeof v === "string" ? Number(v) : v);
export const trimStr = (v: unknown) => (typeof v === "string" ? v.trim() : v);

export const ensureVendorSchema = z.object({
    userId: z.string()
});

export const processPaymentSchema = z.object({
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
