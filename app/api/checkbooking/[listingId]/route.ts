import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/lib/prismadb";

interface IParams {
  listingId?: string;
}

export async function GET(
  request: Request,
  { params }: { params: IParams }
) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.error();
  }

  const { listingId } = params;

  if (!listingId || typeof listingId !== "string") {
    throw new Error("Invalid Listing ID");
  }

  // Check if the user has a reservation for the given listing
  const reservationCount = await prisma.reservation.count({
    where: {
      listingId,
      userId: currentUser.id,
    },
  });

  if (reservationCount === 0) {
    return NextResponse.error();
  }

  // Get the latest reservation for the given listing
  const latestReservation = await prisma.reservation.findFirst({
    where: {
      listingId,
      userId: currentUser.id,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (!latestReservation) {
    return NextResponse.error();
  }

  return NextResponse.json({
    message: 'Reservation found',
    canReview: true,
    latestReservationId: latestReservation.id,
  });
}
