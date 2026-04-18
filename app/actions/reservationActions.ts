"use server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { ReservationService } from "@/lib/reservation/service";

export async function cancelReservation(reservationId: string) {
    const user = await getCurrentUser();
    if (!user?.id) throw new Error("Unauthorized");
    return await ReservationService.updateStatus(reservationId, user.id, 3);
}

export async function updateReservation(reservationId: string, data: { isApproved: number; rejectReason?: string }) {
    const user = await getCurrentUser();
    if (!user?.id) throw new Error("Unauthorized");
    return await ReservationService.updateStatus(reservationId, user.id, data.isApproved, data.rejectReason);
}

export async function deleteReservation(reservationId: string) {
    const user = await getCurrentUser();
    if (!user?.id) throw new Error("Unauthorized");
    return await ReservationService.delete(reservationId, user.id);
}
