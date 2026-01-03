import { NextRequest } from "next/server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";
import prisma from "@/lib/prismadb";

export async function POST(request: NextRequest) {
  try {
    if (!request.headers.get("content-type")?.includes("application/json")) {
      return createErrorResponse("Content-Type must be application/json", 415);
    }

    const currentUser = await getCurrentUser();
    if (!currentUser?.id) {
      return createErrorResponse("Authentication required", 401);
    }

    const body = await request.json().catch(() => ({}));
    const { listingId, reservationId, rating, comment } = body;

    if (!listingId || typeof listingId !== "string" || listingId.trim().length === 0) {
      return createErrorResponse("listingId is required and must be a non-empty string", 400);
    }

    if (!reservationId || typeof reservationId !== "string" || reservationId.trim().length === 0) {
      return createErrorResponse("reservationId is required and must be a non-empty string", 400);
    }

    if (typeof rating !== "number" || !Number.isFinite(rating) || rating < 1 || rating > 5) {
      return createErrorResponse("rating must be a number between 1 and 5", 400);
    }

    if (!comment || typeof comment !== "string") {
      return createErrorResponse("comment is required and must be a string", 400);
    }

    const trimmedComment = comment.trim();
    if (trimmedComment.length < 10) {
      return createErrorResponse("comment must be at least 10 characters long", 400);
    }

    if (trimmedComment.length > 2000) {
      return createErrorResponse("comment is too long (max 2000 characters)", 400);
    }

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, active: true },
    });

    if (!listing) {
      return createErrorResponse("Listing not found", 404);
    }

    const reservation = await prisma.reservation.findFirst({
      where: {
        id: reservationId,
        listingId: listingId,
        userId: currentUser.id,
        markedForDeletion: false,
      },
      select: { id: true },
    });

    if (!reservation) {
      return createErrorResponse("Reservation not found or you don't have permission to review it", 404);
    }

    const existingReview = await prisma.review.findFirst({
      where: {
        reservationId: reservationId,
        userId: currentUser.id,
      },
      select: { id: true },
    });

    if (existingReview) {
      return createErrorResponse("You have already submitted a review for this reservation", 409);
    }

    const review = await prisma.review.create({
      data: {
        userId: currentUser.id,
        listingId: listingId,
        reservationId: reservationId,
        rating: Math.round(rating * 10) / 10,
        comment: trimmedComment,
      },
    });

    try {
      const aggregateResult = await prisma.review.aggregate({
        where: { listingId },
        _avg: { rating: true },
      });

      const avgRating = aggregateResult._avg.rating ?? 0;

      await prisma.listing.update({
        where: { id: listingId },
        data: { avgReviewRating: avgRating },
      });
    } catch (updateError) {
      if (process.env.NODE_ENV === "development") {
        console.error("[Reviews] Failed to update listing average rating:", updateError);
      }
    }

    return createSuccessResponse(review, 201, "Review created successfully");
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return createErrorResponse("You have already submitted a review for this reservation", 409);
    }
    return handleRouteError(error, "POST /api/reviews");
  }
}
