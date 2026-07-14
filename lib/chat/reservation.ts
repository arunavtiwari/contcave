import "server-only";

import type { ChatBooking } from "@/lib/chat/types";
import prisma from "@/lib/prismadb";
import { isChatReadOnly } from "@/lib/reservation/status";

export async function getAuthorizedChatReservation(
  reservationId: string,
  currentUserId: string
): Promise<ChatBooking | null> {
  if (!/^[a-f\d]{24}$/i.test(reservationId) || !currentUserId) {
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
      status: true,
      chatMessages: {
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          sender: { select: { id: true, name: true } },
        },
      },
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
    status: reservation.status,
    readOnly: isChatReadOnly(reservation.status),
    messages: reservation.chatMessages.reverse().map((message) => ({
      id: message.id,
      text: message.text,
      senderId: message.sender?.id || null,
      name: message.kind === "SYSTEM" ? "ContCave" : message.sender?.name || "User",
      timestamp: message.createdAt.toISOString(),
      kind: message.kind,
    })),
  };
}
