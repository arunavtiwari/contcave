import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/lib/prismadb";

export const dynamic = "force-dynamic";

interface IParams {
  listingId?: string;
}

export async function GET(
  request: Request,
  { params }: { params: IParams }
) {
  try {
    const currentUser = await getCurrentUser();

    // Return if no current user (Not Logged In)
    if (!currentUser) {
      return NextResponse.json({
        canReview: false,
        message: "User not authenticated"
      }, { status: 401 }); // Return 401 for unauthorized access
    }

    const { listingId } = params;

    // Validate Listing ID
    if (!listingId || typeof listingId !== "string") {
      return NextResponse.json({
        error: "Invalid Listing ID",
      }, { status: 400 }); 
    }

    // Check if the user has a reservation for the given listing
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

    // If no latest reservation found
    if (!latestReservation) {
      return NextResponse.json({
        error: "No reservation found",
      }, { status: 404 });
    }

    // Successful case: Return reservation details
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
