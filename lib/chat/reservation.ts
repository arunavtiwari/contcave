import "server-only";

import type { ChatBooking } from "@/lib/chat/types";
import prisma from "@/lib/prismadb";

export async function getAuthorizedChatReservation(
  reservationId: string,
  currentUserId: string
): Promise<ChatBooking | null> {
  if (!reservationId || !currentUserId) {
    return null;
  }

  const reservation = await prisma.reservation.findFirst({
    where: {
      id: reservationId,
      markedForDeletion: false,
      OR: [{ userId: currentUserId }, { listing: { userId: currentUserId } }],
    },
    select: {
      startDate: true,
      startTime: true,
      endTime: true,
      totalPrice: true,
      selectedAddons: true,
      listing: {
        select: {
          title: true,
          imageSrc: true,
        },
      },
    },
  });

  if (!reservation) {
    return null;
  }

  return {
    listing: reservation.listing
      ? {
          title: reservation.listing.title,
          imageSrc: reservation.listing.imageSrc,
        }
      : null,
    startDate: reservation.startDate.toISOString(),
    startTime: reservation.startTime,
    endTime: reservation.endTime,
    totalPrice: Number(reservation.totalPrice),
    selectedAddons: reservation.selectedAddons,
  };
}
