import "server-only";

import type { ChatBooking } from "@/lib/chat/types";
import { normalizePhone } from "@/lib/phone";
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
      OR: [
        {
          userId: currentUserId,
          AND: [{ OR: [{ hiddenByGuestAt: null }, { hiddenByGuestAt: { isSet: false } }] }],
        },
        {
          listing: { userId: currentUserId },
          AND: [{ OR: [{ hiddenByOwnerAt: null }, { hiddenByOwnerAt: { isSet: false } }] }],
        },
      ],
    },
    select: {
      startDate: true,
      startTime: true,
      endTime: true,
      totalPrice: true,
      selectedAddons: true,
      status: true,
      user: { select: { name: true, phone: true } },
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
          userId: true,
          user: { select: { phone: true } },
        },
      },
    },
  });

  if (!reservation) {
    return null;
  }

  const viewerIsHost = reservation.listing?.userId === currentUserId;
  const readOnly = isChatReadOnly(reservation.status);
  const counterpartPhone = normalizePhone(
    (viewerIsHost ? reservation.user?.phone : reservation.listing?.user?.phone) ?? undefined
  );

  return {
    counterpartName: viewerIsHost
      ? reservation.user?.name || "Guest"
      : reservation.listing?.title || "Host",
    counterpartWhatsAppUrl: !readOnly && counterpartPhone ? `https://wa.me/91${counterpartPhone}` : null,
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
    readOnly,
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
