import prisma from "@/lib/prismadb";

export class ReviewService {
    /**
     * Create a review and atomically update the listing's average rating.
     * Includes reservation validation and duplicate prevention.
     */
    static async createReview(userId: string, data: { listingId: string; reservationId: string; rating: number; comment: string }) {
        const { listingId, reservationId, rating, comment } = data;
        const trimmedComment = comment.trim();

        if (trimmedComment.length < 10) throw new Error("Comment must be at least 10 characters long");
        if (rating < 1 || rating > 5) throw new Error("Rating must be between 1 and 5");

        return await prisma.$transaction(async (tx) => {
            // 1. Ownership & Eligibility Check
            const reservation = await tx.reservation.findFirst({
                where: { id: reservationId, listingId, userId, markedForDeletion: false },
                select: { id: true }
            });
            if (!reservation) throw new Error("Reservation not found or unauthorized");

            // 2. Duplicate Check
            const existing = await tx.review.findFirst({
                where: { reservationId, userId },
                select: { id: true }
            });
            if (existing) throw new Error("Duplicate review rejected");

            // 3. Create Review
            const review = await tx.review.create({
                data: {
                    source: "PLATFORM",
                    userId,
                    listingId,
                    reservationId,
                    rating: Math.round(rating * 10) / 10,
                    comment: trimmedComment,
                }
            });

            // 4. Recalculate Rating
            const aggregate = await tx.review.aggregate({
                where: { listingId },
                _avg: { rating: true }
            });

            await tx.listing.update({
                where: { id: listingId },
                data: { avgReviewRating: aggregate._avg.rating || 0 }
            });

            return review;
        });
    }

    /**
     * Create a review transcribed from a WhatsApp message by an admin.
     * No platform account or reservation backs it — the guest may never
     * have signed up (this is the only path for CURATED listings, whose
     * bookings never produce a Reservation row).
     */
    static async createWhatsAppReview(adminUserId: string, data: {
        listingId: string;
        guestName: string;
        guestRole?: string;
        rating: number;
        comment: string;
    }) {
        const { listingId, rating, comment } = data;
        const trimmedComment = comment.trim();
        const trimmedName = data.guestName.trim();
        const trimmedRole = data.guestRole?.trim();

        if (trimmedComment.length < 10) throw new Error("Comment must be at least 10 characters long");
        if (trimmedName.length < 2) throw new Error("Guest name is required");
        if (rating < 1 || rating > 5) throw new Error("Rating must be between 1 and 5");

        return await prisma.$transaction(async (tx) => {
            const listing = await tx.listing.findUnique({ where: { id: listingId }, select: { id: true } });
            if (!listing) throw new Error("Listing not found");

            const review = await tx.review.create({
                data: {
                    source: "WHATSAPP",
                    listingId,
                    guestName: trimmedName,
                    guestRole: trimmedRole || null,
                    rating: Math.round(rating * 10) / 10,
                    comment: trimmedComment,
                    addedById: adminUserId,
                }
            });

            const aggregate = await tx.review.aggregate({
                where: { listingId },
                _avg: { rating: true }
            });

            await tx.listing.update({
                where: { id: listingId },
                data: { avgReviewRating: aggregate._avg.rating || 0 }
            });

            return review;
        });
    }

    /**
     * Review Deletion. Admins may delete any review (e.g. a mis-transcribed
     * WhatsApp entry); otherwise the caller must be the reviewer or the
     * listing's owner.
     */
    static async deleteReview(reviewId: string, userId: string, isAdmin = false): Promise<void> {
        const review = await prisma.review.findUnique({
            where: { id: reviewId },
            include: { listing: true }
        });

        if (!review) throw new Error("Review not found");
        if (!isAdmin && review.userId !== userId && review.listing.userId !== userId) throw new Error("Unauthorized");

        await prisma.$transaction(async (tx) => {
            await tx.review.delete({ where: { id: reviewId } });

            const aggregate = await tx.review.aggregate({
                where: { listingId: review.listingId },
                _avg: { rating: true }
            });

            await tx.listing.update({
                where: { id: review.listingId },
                data: { avgReviewRating: aggregate._avg.rating || 0 }
            });
        });
    }
}
