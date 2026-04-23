"use server";

import { revalidatePath } from "next/cache";

import { createAction } from "@/lib/actions-utils";
import { ReservationService } from "@/lib/reservation/service";
import {
    cancelReservationSchema,
    checkBookingSchema,
    deleteReservationSchema,
    updateReservationSchema
} from "@/schemas/reservation";

/**
 * Fetch reservations (Read-only, no wrapper needed but keeping logic clean)
 */
export async function getReservations(params: { listingId?: string; userId?: string; authorId?: string }) {
    try {
        return await ReservationService.getReservations(params);
    } catch (error) {
        console.error("[getReservations] Error:", error);
        return [];
    }
}

/**
 * Cancel a reservation
 */
export const cancelReservationAction = createAction(
    cancelReservationSchema,
    { requireAuth: true },
    async (data, { user }) => {
        await ReservationService.updateStatus(data.reservationId, user!.id, 3);
        revalidatePath("/dashboard/reservations");
        revalidatePath("/dashboard/trips");
        return { success: true };
    }
);

/**
 * Update reservation status (Approve/Reject)
 */
export const updateReservationAction = createAction(
    updateReservationSchema,
    { requireAuth: true },
    async (data, { user }) => {
        await ReservationService.updateStatus(data.reservationId, user!.id, data.isApproved, data.rejectReason);
        revalidatePath("/dashboard/reservations");
        return { success: true };
    }
);

/**
 * Delete a reservation
 */
export const deleteReservationAction = createAction(
    deleteReservationSchema,
    { requireAuth: true },
    async (data, { user }) => {
        await ReservationService.delete(data.reservationId, user!.id);
        revalidatePath("/dashboard/reservations");
        revalidatePath("/dashboard/trips");
        return { success: true };
    }
);

/**
 * Check if the current user has an active booking for a listing
 */
export const checkBookingAction = createAction(
    checkBookingSchema,
    { requireAuth: false },
    async (data, { user }) => {
        if (!user?.id) return null;
        return await ReservationService.checkUserBooking(user.id, data.listingId);
    }
);
// Compatibility Aliases for Legacy Components
export const deleteReservation = deleteReservationAction;
export const updateReservation = updateReservationAction;
