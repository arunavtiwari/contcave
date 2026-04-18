"use server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { ListingService } from "@/lib/listing/service";

export default async function deleteListing(listingId: string) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser?.id) throw new Error("Unauthorized");

        return await ListingService.deleteListing(currentUser.id, listingId);
    } catch (error) {
        console.error('[deleteListing] Error:', error);
        throw error;
    }
}
