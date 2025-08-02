import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/lib/prismadb";
import { NextResponse } from "next/server";

interface IBody {
  listingId: string;
  reservationId: string;
  rating: number;
  comment: string;
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.error();
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
    throw new Error("Invalid input");
  }

  const reservation = await prisma.reservation.findFirst({
    where: {
      id: reservationId,
      listingId: listingId,
      userId: currentUser.id,
    },
  });

  if (!reservation) {
    return NextResponse.error();
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

  return NextResponse.json(review);
}
