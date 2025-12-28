import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/lib/prismadb";
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";

interface IParams {
  reservationId?: string;
}

export async function GET(request: Request, props: { params: Promise<IParams> }) {
  try {
    const params = await props.params;
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return createErrorResponse("Authentication required", 401);
    }

    const { reservationId } = params;

    if (!reservationId || typeof reservationId !== "string") {
      return createErrorResponse("Invalid reservation ID", 400);
    }

    const reservation = await prisma.reservation.findFirst({
      where: {
        id: reservationId,
        markedForDeletion: false,
      },
      include: { listing: true },
    });

    if (!reservation || (reservation.userId !== currentUser.id && reservation.listing.userId !== currentUser.id)) {
      return createErrorResponse("Reservation not found or unauthorized", 404);
    }

    return createSuccessResponse(reservation);
  } catch (error) {
    return handleRouteError(error, "GET /api/reservations/[reservationId]");
  }
}

export async function DELETE(request: Request, props: { params: Promise<IParams> }) {
  try {
    const params = await props.params;
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return createErrorResponse("Authentication required", 401);
    }

    const { reservationId } = params;

    if (!reservationId || typeof reservationId !== "string") {
      return createErrorResponse("Invalid reservation ID", 400);
    }

    const existingReservation = await prisma.reservation.findFirst({
      where: {
        id: reservationId,
        OR: [{ userId: currentUser.id }, { listing: { userId: currentUser.id } }],
      },
    });

    if (!existingReservation) {
      return createErrorResponse("Reservation not found or unauthorized", 404);
    }

    const softDeletedReservation = await prisma.reservation.update({
      where: { id: reservationId },
      data: {
        markedForDeletion: true,
        markedForDeletionAt: new Date(),
      },
    });

    return createSuccessResponse(softDeletedReservation, 200, "Reservation deleted successfully");
  } catch (error) {
    return handleRouteError(error, "DELETE /api/reservations/[reservationId]");
  }
}

export async function PATCH(request: Request, props: { params: Promise<IParams> }) {
  try {
    const params = await props.params;
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return createErrorResponse("Authentication required", 401);
    }

    const { reservationId } = params;

    if (!reservationId || typeof reservationId !== "string") {
      return createErrorResponse("Invalid reservation ID", 400);
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
      return createErrorResponse("Reservation not found or unauthorized", 404);
    }

    const updatedReservation = await prisma.reservation.update({
      where: { id: reservationId },
      data: body,
    });

    return createSuccessResponse(updatedReservation, 200, "Reservation updated successfully");
  } catch (error) {
    return handleRouteError(error, "PATCH /api/reservations/[reservationId]");
  }
}
