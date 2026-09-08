"use server";

import { revalidatePath } from "next/cache";

import { createAction } from "@/lib/actions-utils";
import { ReviewService } from "@/lib/review/service";
import { deleteReviewSchema, whatsAppReviewSchema } from "@/schemas/review";

/**
 * Admin-only: transcribe a review a guest sent over WhatsApp onto a listing.
 * Only path available for CURATED listings, whose bookings never produce a
 * platform Reservation. Merges into the same rating pool as in-app reviews.
 */
export const addWhatsAppReviewAction = createAction(
    whatsAppReviewSchema,
    { requireAuth: true, allowedRoles: ["ADMIN"] },
    async (data, { user }) => {
        const review = await ReviewService.createWhatsAppReview(user!.id, data);
        revalidatePath(`/listings/${data.listingId}`);
        revalidatePath("/admin/dashboard/listings");
        return review;
    }
);

export const deleteReviewAction = createAction(
    deleteReviewSchema,
    { requireAuth: true, allowedRoles: ["ADMIN"] },
    async (data) => {
        await ReviewService.deleteReview(data.reviewId, "", true);
        revalidatePath(`/listings/${data.listingId}`);
        revalidatePath("/admin/dashboard/listings");
        return { success: true };
    }
);
