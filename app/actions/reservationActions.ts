"use server";

import { revalidatePath } from "next/cache";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { ReservationService } from "@/lib/reservation/service";

export type ActionResponse<T = unknown> = {
    success: boolean;
    data?: T;
    error?: string;
};

/**
 * Fetch reservations
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
export async function cancelReservation(reservationId: string): Promise<ActionResponse> {
    try {
        const user = await getCurrentUser();
        if (!user?.id) return { success: false, error: "Unauthorized" };

        await ReservationService.updateStatus(reservationId, user.id, 3);
        revalidatePath("/dashboard/reservations");
        revalidatePath("/dashboard/trips");
        return { success: true };
    } catch (error) {
        console.error("[cancelReservation] Error:", error);
        return { success: false, error: "Failed to cancel reservation" };
    }
}

/**
 * Update reservation status (Approve/Reject)
 */
export async function updateReservation(reservationId: string, data: { isApproved: number; rejectReason?: string }): Promise<ActionResponse> {
    try {
        const user = await getCurrentUser();
        if (!user?.id) return { success: false, error: "Unauthorized" };

        await ReservationService.updateStatus(reservationId, user.id, data.isApproved, data.rejectReason);
        revalidatePath("/dashboard/reservations");
        return { success: true };
    } catch (error) {
        console.error("[updateReservation] Error:", error);
        return { success: false, error: "Failed to update reservation" };
    }
}

/**
 * Delete a reservation
 */
export async function deleteReservation(reservationId: string): Promise<ActionResponse> {
    try {
        const user = await getCurrentUser();
        if (!user?.id) return { success: false, error: "Unauthorized" };

        await ReservationService.delete(reservationId, user.id);
        revalidatePath("/dashboard/reservations");
        revalidatePath("/dashboard/trips");
        return { success: true };
    } catch (error) {
        console.error("[deleteReservation] Error:", error);
        return { success: false, error: "Failed to delete reservation" };
    }
}

/**
 * Check if the current user has an active booking for a listing
 */
export async function checkBookingAction(listingId: string): Promise<ActionResponse<{ id: string; canReview: boolean; status: string; endAt: string } | null>> {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser?.id || !listingId) return { success: true, data: null };

        const res = await ReservationService.checkUserBooking(currentUser.id, listingId);
        return { success: true, data: res };
    } catch (error) {
        console.error("[checkBookingAction] Error:", error);
        return { success: false, error: "Failed to check booking status" };
    }
}
