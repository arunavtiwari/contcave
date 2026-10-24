import { addHours } from "date-fns";

import { PostBookingService } from "@/lib/post-booking/service";
import prisma from "@/lib/prismadb";
import { ReservationService } from "@/lib/reservation/service";
import { parseReservationEndTimeForDate } from "@/lib/reservation/time";
import { getValidatedBaseUrl } from "@/lib/utils";

export async function expireExtensionRequests(limit = 200, extensionId?: string) {
  return await PostBookingService.expireExtensionRequests(limit, extensionId);
}

export async function expireAdditionalCharges(limit = 200, chargeId?: string) {
  return await PostBookingService.expireAdditionalCharges(limit, chargeId);
}

/**
 * Completes bookings once they're over, which is what schedules the owner payout:
 * - checked-in sessions 2 hours after the end (room for extensions), and
 * - confirmed bookings nobody checked in (hosts who run everything on WhatsApp) right after the end.
 *
 * Un-checked-in bookings are only auto-completed if they ended in the last 48 hours, so switching this
 * on never sweeps up old bookings that may already have been settled by hand; those stay for admin.
 */
const UNCHECKED_AUTO_COMPLETE_WINDOW_HOURS = 48;

export async function autoCompleteEndedReservations(limit = 200, reservationId?: string) {
  const now = new Date();
  const reservations = await prisma.reservation.findMany({
    where: {
      ...(reservationId ? { id: reservationId } : {}),
      markedForDeletion: false,
      startDate: { lte: now },
      OR: [
        { status: "CHECKED_IN", checkedInAt: { not: null } },
        { status: "CONFIRMED", OR: [{ checkedInAt: null }, { checkedInAt: { isSet: false } }] },
      ],
    },
    select: { id: true, status: true, startDate: true, endTime: true },
    take: limit,
  });

  const results: Array<{ id: string; status: "completed" | "skipped" | "failed"; error?: string }> = [];
  for (const reservation of reservations) {
    const endAt = parseReservationEndTimeForDate(reservation.startDate, reservation.endTime);
    const checkedIn = reservation.status === "CHECKED_IN";
    const dueAt = endAt && (checkedIn ? addHours(endAt, 2) : endAt);
    const tooOld = !checkedIn && endAt && addHours(endAt, UNCHECKED_AUTO_COMPLETE_WINDOW_HOURS).getTime() < now.getTime();
    if (!dueAt || dueAt.getTime() > now.getTime() || tooOld) {
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

export async function sendExtensionNudges(limit = 200) {
  const now = new Date();
  const reservations = await prisma.reservation.findMany({
    where: {
      status: "CHECKED_IN",
      checkedInAt: { not: null },
      AND: [
        { OR: [{ extensionNudgeSentAt: null }, { extensionNudgeSentAt: { isSet: false } }] },
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
