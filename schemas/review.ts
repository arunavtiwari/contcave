import { z } from "zod";

export const whatsAppReviewSchema = z.object({
    listingId: z.string().min(1, "Listing ID is required"),
    guestName: z.string().trim().min(2, "Guest name is required").max(80),
    guestRole: z.string().trim().max(80).optional(),
    rating: z.number().min(1).max(5),
    comment: z.string().trim().min(10, "Comment must be at least 10 characters long").max(2000),
});

export const deleteReviewSchema = z.object({
    reviewId: z.string().min(1, "Review ID is required"),
    listingId: z.string().min(1, "Listing ID is required"),
});

export type WhatsAppReviewSchema = z.infer<typeof whatsAppReviewSchema>;
export type DeleteReviewSchema = z.infer<typeof deleteReviewSchema>;
