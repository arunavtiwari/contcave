import { sendReviewReminderCustomer } from "@/lib/email/templates";
import prisma from "@/lib/prismadb";
import { formatReservationDate } from "@/lib/reservation/time";
import { getValidatedBaseUrl } from "@/lib/utils";

export const REVIEW_REMINDER_DELAY_MS = 24 * 60 * 60 * 1000;
const DELIVERY_CLAIM_TIMEOUT_MS = 15 * 60 * 1000;

type ReminderResult = { reservationId: string; status: "sent" | "skipped" };

function getReviewUrl(slug: string | null, listingId: string) {
  const identifier = slug || listingId;
  return `${getValidatedBaseUrl()}/listings/${encodeURIComponent(identifier)}`;
}

export class ReviewReminderService {
  static async sendForReservation(reservationId: string, now = new Date()): Promise<ReminderResult> {
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      select: {
        id: true,
        userId: true,
        status: true,
        markedForDeletion: true,
        completedAt: true,
        reviewReminderSentAt: true,
        reviewReminderClaimedAt: true,
        startDate: true,
        startTime: true,
        endTime: true,
        totalPrice: true,
        user: { select: { name: true, email: true } },
        listing: { select: { id: true, slug: true, title: true, actualLocation: true, locationValue: true } },
        Review: { where: {}, select: { id: true }, take: 1 },
      },
    });

    if (!reservation
      || reservation.status !== "COMPLETED"
      || reservation.markedForDeletion
      || !reservation.completedAt
      || reservation.completedAt.getTime() + REVIEW_REMINDER_DELAY_MS > now.getTime()
      || reservation.reviewReminderSentAt
      || reservation.Review.length > 0
      || !reservation.user.email) {
      return { reservationId, status: "skipped" };
    }

    const staleClaimBefore = new Date(now.getTime() - DELIVERY_CLAIM_TIMEOUT_MS);
    const claim = await prisma.reservation.updateMany({
      where: {
        id: reservationId,
        status: "COMPLETED",
        markedForDeletion: false,
        AND: [
          { OR: [{ reviewReminderSentAt: null }, { reviewReminderSentAt: { isSet: false } }] },
          {
            OR: [
              { reviewReminderClaimedAt: null },
              { reviewReminderClaimedAt: { isSet: false } },
              { reviewReminderClaimedAt: { lte: staleClaimBefore } },
            ],
          },
        ],
      },
      data: { reviewReminderClaimedAt: now },
    });
    if (claim.count !== 1) return { reservationId, status: "skipped" };

    try {
      const alreadyReviewed = await prisma.review.findFirst({
        where: { reservationId, userId: reservation.userId },
        select: { id: true },
      });
      if (alreadyReviewed) {
        await prisma.reservation.update({ where: { id: reservationId }, data: { reviewReminderClaimedAt: null } });
        return { reservationId, status: "skipped" };
      }

      await sendReviewReminderCustomer({
        toEmail: reservation.user.email,
        toName: reservation.user.name || "there",
        studioName: reservation.listing.title,
        startDate: formatReservationDate(reservation.startDate),
        startTime: reservation.startTime,
        endTime: reservation.endTime,
        totalPrice: reservation.totalPrice,
        studioLocation: reservation.listing.locationValue,
        reviewUrl: getReviewUrl(reservation.listing.slug, reservation.listing.id),
      });
      await prisma.reservation.update({
        where: { id: reservationId },
        data: { reviewReminderSentAt: now, reviewReminderClaimedAt: null },
      });
      return { reservationId, status: "sent" };
    } catch (error) {
      await prisma.reservation.update({
        where: { id: reservationId },
        data: { reviewReminderClaimedAt: null, reviewReminderAttempts: { increment: 1 } },
      }).catch(() => undefined);
      throw error;
    }
  }

  static async sendDue(limit = 100, now = new Date()): Promise<ReminderResult[]> {
    const dueBefore = new Date(now.getTime() - REVIEW_REMINDER_DELAY_MS);
    const reservations = await prisma.reservation.findMany({
      where: {
        status: "COMPLETED",
        markedForDeletion: false,
        completedAt: { lte: dueBefore },
        AND: [
          { OR: [{ reviewReminderSentAt: null }, { reviewReminderSentAt: { isSet: false } }] },
        ],
      },
      select: { id: true },
      orderBy: { completedAt: "asc" },
      take: limit,
    });
    return await Promise.all(reservations.map((reservation) => this.sendForReservation(reservation.id, now)));
  }
}
