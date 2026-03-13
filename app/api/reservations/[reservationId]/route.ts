import getCurrentUser from "@/app/actions/getCurrentUser";
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";
import prisma from "@/lib/prismadb";
import { formatInTimeZone } from "date-fns-tz";
import { WhatsappService } from "@/lib/whatsapp/service";

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

    const existingReservation = await prisma.reservation.findFirst({
      where: {
        id: reservationId,
        markedForDeletion: false,
        OR: [
          { listing: { userId: currentUser.id } }, // Host
          { userId: currentUser.id }            // Customer
        ]
      },
      select: { id: true, userId: true, listing: { select: { userId: true } } },
    });

    if (!existingReservation) {
      return createErrorResponse("Reservation not found or unauthorized", 404);
    }

    // Authorization checks:
    // 1. Only host can Approve (1) or Reject (0)
    if ((updateData.isApproved === 0 || updateData.isApproved === 1) && existingReservation.listing.userId !== currentUser.id) {
      return createErrorResponse("Only listing owners can approve/reject reservations", 403);
    }

    // 2. Only customer can Cancel (3) - strictly for their own booking
    if (updateData.isApproved === 3 && existingReservation.userId !== currentUser.id) {
      return createErrorResponse("Only the customer can cancel their reservation", 403);
    }

    const updatedReservation = await prisma.reservation.update({
      where: { id: reservationId },
      data: updateData,
    });

    // Fire-and-forget WhatsApp notification on host approval or customer cancellation
    if (updateData.isApproved === 1 || updateData.isApproved === 3) {
      (async () => {
        try {
          const resv = await prisma.reservation.findUnique({
            where: { id: reservationId },
            include: {
              user: { select: { phone: true, name: true } },
              listing: { select: { title: true, actualLocation: true, user: { select: { name: true, phone: true } } } },
            },
          });

          if (!resv) return;

          // Strictly formatted in IST as per user specification
          const startDateStr = resv.startDate ? formatInTimeZone(resv.startDate, "Asia/Kolkata", "dd MMM yyyy") : "";
          const timeSlotStr = resv.endTime ? `${resv.startTime} to ${resv.endTime}` : (resv.startTime || "");

          // Case 1: Host approves the booking -> Notify customer
          if (updateData.isApproved === 1) {
            const customerPhone = resv.user?.phone;
            if (customerPhone) {
              const locationLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                (resv.listing?.actualLocation as any)?.display_name || ""
              )}`;
              await WhatsappService.sendBookingConfirmedCustomer(customerPhone, {
                customerName: resv.user?.name || "Customer",
                listingTitle: resv.listing?.title || "Studio",
                startDate: startDateStr,
                startTime: timeSlotStr,
                locationLink,
              }).catch(() => { });
            }
          }

          // Case 2: Customer cancels their own booking -> Notify host
          if (updateData.isApproved === 3 && resv.userId === currentUser.id) {
            const hostPhone = resv.listing?.user?.phone;
            if (hostPhone) {
              await WhatsappService.sendBookingCancelledHost(hostPhone, {
                hostName: resv.listing?.user?.name || "Host",
                customerName: resv.user?.name || "Customer",
                listingTitle: resv.listing?.title || "Studio",
                startDate: startDateStr,
                // Time is not passed in the template anymore
              }).catch(() => { });
            }
          }

        } catch (e) {
          console.error("[Reservation PATCH] WhatsApp notification error", {
            reservationId,
            error: e instanceof Error ? e.message : String(e),
          });
        }
      })();
    }

    return createSuccessResponse(updatedReservation, 200, "Reservation updated successfully");
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2025") {
      return createErrorResponse("Reservation not found", 404);
    }
    return handleRouteError(error, "PATCH /api/reservations/[reservationId]");
  }
}
