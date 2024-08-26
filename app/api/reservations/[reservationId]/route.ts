import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/lib/prismadb";
import { NextResponse } from "next/server";

interface IParams {
  reservationId?: string;
}

export async function GET(
  request: Request,
  { params }: { params: IParams }
) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.error();
  }

  const { reservationId } = params;

  if (!reservationId || typeof reservationId !== "string") {
    throw new Error("Invalid Id");
  }

  try {
    const reservation = await prisma.reservation.findUnique({
      where: {
        id: reservationId,
      },
      include: {
        listing: true, // Include related listing data if needed
      },
    });

    if (!reservation || (reservation.userId !== currentUser.id && reservation.listing.userId !== currentUser.id)) {
      return NextResponse.error();
    }

    return NextResponse.json(reservation);
  } catch (error) {
    console.error("Error fetching reservation:", error);
    return NextResponse.error();
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: IParams }
) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.error();
  }

  const { reservationId } = params;

  if (!reservationId || typeof reservationId !== "string") {
    throw new Error("Invalid Id");
  }

  try {
    const reservation = await prisma.reservation.deleteMany({
      where: {
        id: reservationId,
        OR: [{ userId: currentUser.id }, { listing: { userId: currentUser.id } }],
      },
    });

    return NextResponse.json(reservation);
  } catch (error) {
    console.error("Error deleting reservation:", error);
    return NextResponse.error();
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: IParams }
) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.error();
  }

  const { reservationId } = params;

  if (!reservationId || typeof reservationId !== "string") {
    throw new Error("Invalid Id");
  }

  const body = await request.json();

  try {
    const reservation = await prisma.reservation.update({
      where: {
        id: reservationId,
      },
      data: body,
    });

    return NextResponse.json(reservation);
  } catch (error) {
    console.error("Error updating reservation:", error);
    return NextResponse.error();
  }
}
