import getCurrentUser from "@/app/actions/getCurrentUser";
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";
import prisma from "@/lib/prismadb";
import { ReservationService } from "@/lib/reservation/service";

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

    try {
      await ReservationService.delete(reservationId, currentUser.id);
      return createSuccessResponse(null, 200, "Reservation deleted successfully");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete reservation";
      return createErrorResponse(message, 400);
    }
  } catch (error) {
    return handleRouteError(error, "DELETE /api/reservations/[reservationId]");
  }
}

export async function PATCH(request: Request, props: { params: Promise<IParams> }) {
  try {
    const params = await props.params;
    const currentUser = await getCurrentUser();

    if (!currentUser?.id) {
      return createErrorResponse("Authentication required", 401);
    }

    const { reservationId } = params;

    if (!reservationId || typeof reservationId !== "string" || reservationId.trim().length === 0) {
      return createErrorResponse("Invalid reservation ID", 400);
    }

    if (!request.headers.get("content-type")?.includes("application/json")) {
      return createErrorResponse("Content-Type must be application/json", 415);
    }

    const body = await request.json().catch(() => ({}));

    const updateData: Record<string, unknown> = {};

    if ("isApproved" in body) {
      if (typeof body.isApproved !== "number" || (body.isApproved !== 0 && body.isApproved !== 1 && body.isApproved !== 3)) {
        return createErrorResponse("isApproved must be 0, 1, or 3", 400);
      }
      updateData.isApproved = body.isApproved;
    }

    if ("rejectReason" in body) {
      if (typeof body.rejectReason !== "string") {
        return createErrorResponse("rejectReason must be a string", 400);
      }
      const trimmedReason = body.rejectReason.trim();
      if (trimmedReason.length > 500) {
        return createErrorResponse("rejectReason is too long (max 500 characters)", 400);
      }
      updateData.rejectReason = trimmedReason || null;
    }

    if (Object.keys(updateData).length === 0) {
      return createErrorResponse("No valid fields to update", 400);
    }

    try {
      await ReservationService.updateStatus(reservationId, currentUser.id, updateData.isApproved as number, updateData.rejectReason as string);
      return createSuccessResponse(null, 200, "Reservation updated successfully");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update reservation";
      return createErrorResponse(message, 400);
    }
  } catch (error) {
    return handleRouteError(error, "PATCH /api/reservations/[reservationId]");
  }
}
