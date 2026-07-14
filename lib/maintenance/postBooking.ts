import { addHours } from "date-fns";

import { PostBookingService } from "@/lib/post-booking/service";
import prisma from "@/lib/prismadb";
import { ReservationService } from "@/lib/reservation/service";
import { parseReservationEndTimeForDate } from "@/lib/reservation/time";
import { getValidatedBaseUrl } from "@/lib/utils";

export async function expireExtensionRequests(limit = 200, extensionId?: string, createdAfter?: Date) {
  return await PostBookingService.expireExtensionRequests(limit, extensionId, createdAfter);
}

export async function expireAdditionalCharges(limit = 200, chargeId?: string, createdAfter?: Date) {
  return await PostBookingService.expireAdditionalCharges(limit, chargeId, createdAfter);
}

export async function autoCompleteCheckedInReservations(limit = 200, reservationId?: string, createdAfter?: Date) {
  const now = new Date();
  const reservations = await prisma.reservation.findMany({
    where: {
      ...(reservationId ? { id: reservationId } : {}),
      ...(createdAfter ? { createdAt: { gte: createdAfter } } : {}),
      status: "CHECKED_IN",
      checkedInAt: { not: null },
      markedForDeletion: false,
    },
    select: { id: true, startDate: true, endTime: true },
    take: limit,
  });

  const results: Array<{ id: string; status: "completed" | "skipped" | "failed"; error?: string }> = [];
  for (const reservation of reservations) {
    const endAt = parseReservationEndTimeForDate(reservation.startDate, reservation.endTime);
    if (!endAt || addHours(endAt, 2).getTime() > now.getTime()) {
      results.push({ id: reservation.id, status: "skipped" });
      continue;
    }

    try {
      await ReservationService.complete(reservation.id, "__system__", { system: true });
      results.push({ id: reservation.id, status: "completed" });
    } catch (error) {
      results.push({
        id: reservation.id,
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return results;
}

export async function getUnverifiedBookings(limit = 200) {
  const now = new Date();
  const reservations = await prisma.reservation.findMany({
    where: {
      status: "CONFIRMED",
      OR: [{ checkedInAt: null }, { checkedInAt: { isSet: false } }],
      markedForDeletion: false,
    },
    select: {
      id: true,
      bookingId: true,
      startDate: true,
      endTime: true,
      listing: { select: { title: true } },
      user: { select: { name: true, email: true } },
    },
    take: limit,
    orderBy: { startDate: "asc" },
  });

  return reservations.filter((reservation) => {
    const endAt = parseReservationEndTimeForDate(reservation.startDate, reservation.endTime);
    return Boolean(endAt && addHours(endAt, 2).getTime() <= now.getTime());
  });
}

export async function sendExtensionNudges(limit = 200, createdAfter?: Date) {
  const now = new Date();
  const reservations = await prisma.reservation.findMany({
    where: {
      status: "CHECKED_IN",
      ...(createdAfter ? { createdAt: { gte: createdAfter } } : {}),
      checkedInAt: { not: null },
      OR: [
        { extensionNudgeSentAt: null },
        { extensionNudgeSentAt: { isSet: false } },
      ],
      markedForDeletion: false,
    },
    include: {
      user: true,
      listing: { include: { user: true } },
    },
    take: limit,
  });

  const results: Array<{ id: string; status: "sent" | "skipped" | "failed"; error?: string }> = [];
  for (const reservation of reservations) {
    const endAt = parseReservationEndTimeForDate(reservation.startDate, reservation.endTime);
    if (!endAt) {
      results.push({ id: reservation.id, status: "skipped" });
      continue;
    }

    const msUntilEnd = endAt.getTime() - now.getTime();
    if (msUntilEnd < 0 || msUntilEnd > 10 * 60 * 1000) {
      results.push({ id: reservation.id, status: "skipped" });
      continue;
    }

    try {
      const { WhatsappService } = await import("@/lib/whatsapp/service");
      if (!reservation.listing.user.phone) {
        await prisma.reservation.update({
          where: { id: reservation.id },
          data: { extensionNudgeSentAt: new Date() },
        });
        results.push({ id: reservation.id, status: "skipped" });
        continue;
      }

      await WhatsappService.sendExtensionNudgeHost(reservation.listing.user.phone, {
        hostName: reservation.listing.user.name || "Host",
        customerName: reservation.user.name || "Customer",
        endTime: reservation.endTime,
        bookingUrl: `${getValidatedBaseUrl()}/dashboard/reservations`,
        idempotencyKey: `extension_nudge_${reservation.id}_${reservation.endTime}`,
      });
      await prisma.reservation.update({
        where: { id: reservation.id },
        data: { extensionNudgeSentAt: new Date() },
      });
      results.push({ id: reservation.id, status: "sent" });
    } catch (error) {
      results.push({
        id: reservation.id,
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return results;
}
