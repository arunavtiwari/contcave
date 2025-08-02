import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/lib/prismadb";

export const dynamic = "force-dynamic";

interface IParams {
  listingId?: string;
}

export async function GET(request: Request, props: { params: Promise<IParams> }) {
  const params = await props.params;
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({
        canReview: false,
        message: "User not authenticated"
      }, { status: 401 });
    }

    const { listingId } = params;

    if (!listingId || typeof listingId !== "string") {
      return NextResponse.json({
        error: "Invalid Listing ID",
      }, { status: 400 });
    }

    const reservationCount = await prisma.reservation.count({
      where: {
        listingId,
        userId: currentUser.id,
      },
    });

    if (reservationCount === 0) {
      return NextResponse.json({
        canReview: false,
        message: "No reservations found for this user and listing"
      });
    }

    const latestReservation = await prisma.reservation.findFirst({
      where: {
        listingId,
        userId: currentUser.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!latestReservation || latestReservation.startDate > new Date()) {

      return NextResponse.json({
        error: "No reservation found",
      }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Reservation found',
      canReview: true,
      latestReservationId: latestReservation.id,
    });
  } catch (error) {
    console.error("Error in fetching reservation:", error);
    return NextResponse.json({
      error: "Internal Server Error",
    }, { status: 500 });
  }
}