"use server";

import { revalidatePath } from "next/cache";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { ListingService } from "@/lib/listing/service";
import { ListingSchema } from "@/schemas/listing";
import type { FullListing } from "@/types/listing";

/**
 * Enterprise-grade Server Action for Creating a Listing
 * Leverages ListingService for transactional persistence and normalization.
 */
export async function createListingAction(body: Partial<ListingSchema> & Record<string, unknown>): Promise<FullListing | null> {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser?.id) throw new Error("Unauthorized");

        if (!currentUser.is_owner) {
            throw new Error("Only owners can create listings");
        }

        const listing = await ListingService.createListing(currentUser.id, body);

        revalidatePath("/properties");
        return listing;
    } catch (error) {
        console.error("[createListingAction] Error:", error);
        throw error;
    }
}

/**
 * Enterprise-grade Server Action for Updating a Listing
 * Leverages ListingService for transactional persistence and relational safety.
 */
export async function updateListingAction(listingId: string, body: Partial<ListingSchema> & Record<string, unknown>): Promise<FullListing | null> {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser?.id) throw new Error("Unauthorized");

        const listing = await ListingService.updateListing(currentUser.id, listingId, body);

        revalidatePath(`/listing/${listingId}`);
        revalidatePath("/properties");

        return listing;
    } catch (error) {
        console.error("[updateListingAction] Error:", error);
        throw error;
    }
}

/**
 * Enterprise-grade Server Action for Deleting a Listing
 */
export async function deleteListingAction(listingId: string) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser?.id) throw new Error("Unauthorized");

        await ListingService.deleteListing(currentUser.id, listingId);

        revalidatePath("/properties");
        return { success: true };
    } catch (error) {
        console.error("[deleteListingAction] Error:", error);
        throw error;
    }
}
