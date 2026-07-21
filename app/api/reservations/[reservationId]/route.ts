import getCurrentUser from "@/app/actions/getCurrentUser";
import { createErrorResponse, createKnownErrorResponse, createSuccessResponse, handleRouteError, readJsonObject } from "@/lib/api-utils";
import prisma from "@/lib/prismadb";
import { ReservationService } from "@/lib/reservation/service";
import { updateReservationSchema } from "@/schemas/reservation";
import { UserRole } from "@/types/user";

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

    if (!reservationId || !/^[a-f\d]{24}$/i.test(reservationId)) {
      return createErrorResponse("Invalid reservation ID", 400);
    }

    const visibility = await prisma.reservation.findUnique({
      where: { id: reservationId },
      select: {
        userId: true,
        markedForDeletion: true,
        hiddenByGuestAt: true,
        hiddenByOwnerAt: true,
        listing: { select: { userId: true } },
      },
    });

    const isGuest = visibility?.userId === currentUser.id;
    const isOwner = visibility?.listing.userId === currentUser.id;
    const hiddenFromViewer = currentUser.role !== UserRole.ADMIN && (
      visibility?.markedForDeletion === true
      || (isGuest && Boolean(visibility?.hiddenByGuestAt))
      || (isOwner && Boolean(visibility?.hiddenByOwnerAt))
    );
    if (!visibility || hiddenFromViewer || (!isGuest && !isOwner && currentUser.role !== UserRole.ADMIN)) {
      return createErrorResponse("Reservation not found or unauthorized", 404);
    }

    const reservation = (await ReservationService.getReservations({ reservationId }))[0];

    if (
      !reservation ||
      (
        !isGuest &&
        !isOwner &&
        currentUser.role !== UserRole.ADMIN
      )
    ) {
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

    if (!reservationId || !/^[a-f\d]{24}$/i.test(reservationId)) {
      return createErrorResponse("Invalid reservation ID", 400);
    }

    const existingReservation = await prisma.reservation.findFirst({
      where: {
        id: reservationId,
        ...(currentUser.role === UserRole.ADMIN
          ? {}
          : { OR: [{ userId: currentUser.id }, { listing: { userId: currentUser.id } }] }),
      },
    });

    if (!existingReservation) {
      return createErrorResponse("Reservation not found or unauthorized", 404);
    }

    try {
      await ReservationService.delete(reservationId, currentUser.id, currentUser.role === UserRole.ADMIN);
      return createSuccessResponse(null, 200, "Reservation deleted successfully");
    } catch (error) {
      const knownResponse = createKnownErrorResponse(error);
      if (knownResponse) return knownResponse;
      throw error;
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

    if (!reservationId || !/^[a-f\d]{24}$/i.test(reservationId)) {
      return createErrorResponse("Invalid reservation ID", 400);
    }

    const parsedBody = await readJsonObject(request, 10_000);
    if (!parsedBody.success) return parsedBody.response;
    const parsedUpdate = updateReservationSchema.safeParse({
      ...parsedBody.data,
      reservationId,
    });
    if (!parsedUpdate.success) {
      return createErrorResponse(parsedUpdate.error.issues[0]?.message || "Invalid reservation update", 400);
    }

    try {
      await ReservationService.updateStatus(
        reservationId,
        currentUser.id,
        parsedUpdate.data.status,
        parsedUpdate.data.rejectReason,
        currentUser.role === UserRole.ADMIN
      );
      return createSuccessResponse(null, 200, "Reservation updated successfully");
    } catch (error) {
      const knownResponse = createKnownErrorResponse(error);
      if (knownResponse) return knownResponse;
      throw error;
    }
  } catch (error) {
    return handleRouteError(error, "PATCH /api/reservations/[reservationId]");
  }
}
