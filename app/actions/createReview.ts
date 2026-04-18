"use server";



import getCurrentUser from "@/app/actions/getCurrentUser";
import { ReviewService } from "@/lib/review/service";

export default async function createReview(data: {
    listingId: string;
    reservationId: string;
    rating: number;
    comment: string;
}) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser?.id) throw new Error("Unauthorized");

        return await ReviewService.createReview(currentUser.id, data);
    } catch (error) {
        console.error('[createReview] Error:', error);
        throw error;
    }
}
