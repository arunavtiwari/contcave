"use server";

import { revalidatePath } from "next/cache";

import { ListingService } from "@/lib/listing/service";

export default async function rejectListing(_prevState: unknown, formData: FormData): Promise<{ success?: boolean; error?: string }> {
    const listingId = formData.get("listingId") as string;

    if (!listingId) return { error: "Listing ID is required." };

    try {
        await ListingService.updateStatus(listingId, "REJECTED", false);
        revalidatePath("/dashboard/listings");
        return { success: true };
    } catch (error: unknown) {
        return { error: `Failed to reject listing: ${String(error)}` };
    }
}
