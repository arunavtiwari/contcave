import { Prisma } from "@prisma/client";

import { UserFacingError } from "@/lib/errors";
import prisma from "@/lib/prismadb";
import { SafeReview } from "@/types/review";

export class ReviewService {
    /**
     * Create a review and atomically update the listing's average rating.
     * Includes reservation validation and duplicate prevention.
     */
    static async createReview(userId: string, data: { listingId: string; reservationId: string; rating: number; comment: string }): Promise<SafeReview> {
        const { listingId, reservationId, rating, comment } = data;
        const trimmedComment = comment.trim();

        if (trimmedComment.length < 10) throw new UserFacingError("Comment must be at least 10 characters long");
        if (rating < 1 || rating > 5) throw new UserFacingError("Rating must be between 1 and 5");

        try {
            const review = await prisma.$transaction(async (tx) => {
                // 1. Ownership & Eligibility Check
                const reservation = await tx.reservation.findFirst({
                    where: { id: reservationId, listingId, userId, markedForDeletion: false, status: "COMPLETED" },
                    select: { id: true }
                });
                if (!reservation) throw new UserFacingError("A completed reservation is required to leave a review", 403);

                // 2. Duplicate Check
                const existing = await tx.review.findFirst({
                    where: { reservationId, userId },
                    select: { id: true }
                });
                if (existing) throw new UserFacingError("You have already reviewed this reservation", 409);

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

            return { ...review, createdAt: review.createdAt.toISOString() };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
                throw new UserFacingError("You have already reviewed this reservation", 409);
            }
            throw error;
        }
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

        if (trimmedComment.length < 10) throw new UserFacingError("Comment must be at least 10 characters long");
        if (trimmedName.length < 2) throw new UserFacingError("Guest name is required");
        if (rating < 1 || rating > 5) throw new UserFacingError("Rating must be between 1 and 5");

        return await prisma.$transaction(async (tx) => {
            const listing = await tx.listing.findUnique({ where: { id: listingId }, select: { id: true } });
            if (!listing) throw new UserFacingError("Listing not found", 404);

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
        if (!/^[a-f\d]{24}$/i.test(reviewId)) {
            throw new UserFacingError("Review not found", 404);
        }
        const review = await prisma.review.findUnique({
            where: { id: reviewId },
            select: { userId: true, listingId: true, listing: { select: { userId: true } } }
        });

        if (!review) throw new UserFacingError("Review not found", 404);
        if (!isAdmin && review.userId !== userId && review.listing?.userId !== userId) {
            throw new UserFacingError("Unauthorized", 403);
        }

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
