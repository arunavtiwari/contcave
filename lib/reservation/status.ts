import type { ReservationStatus } from "@prisma/client";

export const ACTIVE_RESERVATION_STATUSES: ReservationStatus[] = [
  "PENDING_APPROVAL",
  "CONFIRMED",
  "CHECKED_IN",
];

export const PAYOUT_ELIGIBLE_RESERVATION_STATUSES: ReservationStatus[] = [
  "COMPLETED",
  "NO_SHOW",
];


export function isChatReadOnly(status: ReservationStatus) {
  return !ACTIVE_RESERVATION_STATUSES.includes(status);
}

export function isInvoiceEligible(params: { status: ReservationStatus }) {
  return ["CONFIRMED", "CHECKED_IN", "COMPLETED"].includes(params.status);
}

export function canCreatePostBookingCharge(params: {
  status: ReservationStatus;
  completedAt?: Date | null;
  now?: Date;
}) {
  if (params.status === "CHECKED_IN") return true;
  if (params.status !== "COMPLETED" || !params.completedAt) return false;
  const now = params.now ?? new Date();
  return now.getTime() - params.completedAt.getTime() <= 24 * 60 * 60 * 1000;
}
