"use server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { ReservationService } from "@/lib/reservation/service";

export default async function checkBooking(listingId: string) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser?.id || !listingId) return null;

        return await ReservationService.checkUserBooking(currentUser.id, listingId);
    } catch (error) {
        console.error('[checkBooking] Error:', error);
        return null;
    }
}
