import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/lib/prismadb";
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";

interface IBody {
  listingId: string;
  reservationId: string;
  rating: number;
  comment: string;
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return createErrorResponse("Authentication required", 401);
    }

    const body: IBody = await request.json();
    const { listingId, reservationId, rating, comment } = body;

    if (
      !listingId ||
      typeof listingId !== "string" ||
      !reservationId ||
      typeof reservationId !== "string" ||
      typeof rating !== "number" ||
      rating < 1 ||
      rating > 5 ||
      !comment ||
      typeof comment !== "string"
    ) {
      return createErrorResponse("Invalid input: Check listingId, reservationId, rating (1-5), and comment", 400);
    }

    const reservation = await prisma.reservation.findFirst({
      where: {
        id: reservationId,
        listingId: listingId,
        userId: currentUser.id,
      },
    });

    if (!reservation) {
      return createErrorResponse("Reservation not found or unauthorized", 404);
    }

    const review = await prisma.review.create({
      data: {
        userId: currentUser.id,
        listingId: listingId,
        reservationId: reservationId,
        rating: rating,
        comment: comment,
      },
    });

    const aggregateResult = await prisma.review.aggregate({
      where: { listingId },
      _avg: { rating: true },
    });

    const avgRating = aggregateResult._avg.rating ?? 0;

    await prisma.listing.update({
      where: { id: listingId },
      data: { avgReviewRating: avgRating },
    });

    return createSuccessResponse(review, 201, "Review created successfully");
  } catch (error) {
    return handleRouteError(error, "POST /api/reviews");
  }
}
