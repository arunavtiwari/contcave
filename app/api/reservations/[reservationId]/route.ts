import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/lib/prismadb";
import { NextResponse } from "next/server";

interface IParams {
  reservationId?: string;
}

// GET Reservation by ID
export async function GET(request: Request, props: { params: Promise<IParams> }) {
  const params = await props.params;
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { reservationId } = params;

    if (!reservationId || typeof reservationId !== "string") {
      return NextResponse.json({ error: 'Invalid Reservation ID' }, { status: 400 });
    }

    const reservation = await prisma.reservation.findFirst({
      where: {
        id: reservationId,
        markedForDeletion: false,
      },
      include: { listing: true },
    });

    if (!reservation || (reservation.userId !== currentUser.id && reservation.listing.userId !== currentUser.id)) {
      return NextResponse.json({ error: 'Not Found or Unauthorized' }, { status: 404 });
    }

    return NextResponse.json(reservation);

  } catch (error) {
    console.error("Error fetching reservation:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE Reservation by ID
export async function DELETE(request: Request, props: { params: Promise<IParams> }) {
  const params = await props.params;
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { reservationId } = params;

    if (!reservationId || typeof reservationId !== "string") {
      return NextResponse.json({ error: 'Invalid Reservation ID' }, { status: 400 });
    }

    const existingReservation = await prisma.reservation.findFirst({
      where: {
        id: reservationId,
        OR: [{ userId: currentUser.id }, { listing: { userId: currentUser.id } }],
      },
    });

    if (!existingReservation) {
      return NextResponse.json({ error: 'Reservation Not Found or Unauthorized' }, { status: 404 });
    }

    const softDeletedReservation = await prisma.reservation.update({
      where: { id: reservationId },
      data: {
        markedForDeletion: true,
        markedForDeletionAt: new Date(),
      },
    });

    return NextResponse.json(softDeletedReservation);

  } catch (error) {
    console.error("Error soft deleting reservation:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PATCH Reservation by ID
export async function PATCH(request: Request, props: { params: Promise<IParams> }) {
  const params = await props.params;
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { reservationId } = params;

    if (!reservationId || typeof reservationId !== "string") {
      return NextResponse.json({ error: 'Invalid Reservation ID' }, { status: 400 });
    }

    const body = await request.json();

    const existingReservation = await prisma.reservation.findFirst({
      where: {
        id: reservationId,
        markedForDeletion: false,
        OR: [{ userId: currentUser.id }, { listing: { userId: currentUser.id } }],
      },
    });

    if (!existingReservation) {
      return NextResponse.json({ error: 'Reservation Not Found or Unauthorized' }, { status: 404 });
    }

    const updatedReservation = await prisma.reservation.update({
      where: { id: reservationId },
      data: body,
    });

    return NextResponse.json(updatedReservation);

  } catch (error) {
    console.error("Error updating reservation:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
