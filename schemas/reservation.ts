import { z } from "zod";

export const cancelReservationSchema = z.object({
    reservationId: z.string().min(1, "Reservation ID is required"),
});

export const updateReservationSchema = z.object({
    reservationId: z.string().min(1, "Reservation ID is required"),
    isApproved: z.number().min(1).max(3),
    rejectReason: z.string().optional(),
});

export const deleteReservationSchema = z.object({
    reservationId: z.string().min(1, "Reservation ID is required"),
});

export const checkBookingSchema = z.object({
    listingId: z.string().min(1, "Listing ID is required"),
});

export type CancelReservationSchema = z.infer<typeof cancelReservationSchema>;
export type UpdateReservationSchema = z.infer<typeof updateReservationSchema>;
export type DeleteReservationSchema = z.infer<typeof deleteReservationSchema>;
export type CheckBookingSchema = z.infer<typeof checkBookingSchema>;
