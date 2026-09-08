import { z } from "zod";

import { objectIdSchema } from "@/schemas/common";

export const cancelReservationSchema = z.object({
    reservationId: objectIdSchema,
});

export const updateReservationSchema = z.object({
    reservationId: objectIdSchema,
    status: z.enum(["CONFIRMED", "CANCELLED"]),
    rejectReason: z.string().trim().max(500).optional(),
});

export const reservationIdSchema = z.object({
    reservationId: objectIdSchema,
});

export const createExtensionRequestSchema = z.object({
    reservationId: objectIdSchema,
    durationMinutes: z.coerce.number().int().min(30).max(12 * 60).refine((value) => value % 30 === 0, "Duration must use 30-minute increments"),
    extraAmount: z.coerce.number().int().positive("Extension price must be greater than zero").max(10_000_000, "Extension price exceeds the maximum"),
});

const additionalChargeItemSchema = z.object({
    name: z.string().trim().min(1).max(80),
    qty: z.coerce.number().int().min(1).max(100),
    unitPrice: z.coerce.number().int().positive().max(10000000),
});

export const createAdditionalChargeSchema = z.object({
    reservationId: objectIdSchema,
    type: z.enum(["SERVICE", "DAMAGE"]),
    items: z.array(additionalChargeItemSchema).min(1).max(20),
    note: z.string().trim().max(500).optional(),
}).refine((value) => value.type !== "DAMAGE" || Boolean(value.note?.trim()), {
    message: "Damage charges require a note",
    path: ["note"],
});

export const extensionRequestIdSchema = z.object({
    extensionRequestId: objectIdSchema,
});

export const additionalChargeIdSchema = z.object({
    additionalChargeId: objectIdSchema,
});

export const updateAdditionalChargeSchema = z.object({
    additionalChargeId: objectIdSchema,
    items: z.array(additionalChargeItemSchema).min(1).max(20),
    note: z.string().trim().max(500).optional(),
});

export const recordRefundSchema = z.object({
    reservationId: objectIdSchema,
    status: z.enum(["REFUNDED", "PARTIALLY_REFUNDED"]),
    amount: z.coerce.number().int().positive("Refund amount must be greater than zero"),
    note: z.string().trim().max(500).optional(),
});

export const deleteReservationSchema = z.object({
    reservationId: objectIdSchema,
});

export const checkBookingSchema = z.object({
    listingId: objectIdSchema,
});

export type CancelReservationSchema = z.infer<typeof cancelReservationSchema>;
export type UpdateReservationSchema = z.infer<typeof updateReservationSchema>;
export type CreateExtensionRequestSchema = z.infer<typeof createExtensionRequestSchema>;
export type CreateAdditionalChargeSchema = z.infer<typeof createAdditionalChargeSchema>;
export type DeleteReservationSchema = z.infer<typeof deleteReservationSchema>;
export type CheckBookingSchema = z.infer<typeof checkBookingSchema>;
