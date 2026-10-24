import type { ReservationStatus } from "@prisma/client";

import { parseReservationEndTimeForDate, parseReservationTimeForDate } from "./time";

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

const THIRTY_MINUTES_MS = 30 * 60 * 1000;

type SessionTimes = { startDate: Date | string; startTime: string; endTime: string; now?: Date };

function sessionWindow({ startDate, startTime, endTime }: SessionTimes) {
  const date = startDate instanceof Date ? startDate : new Date(startDate);
  return {
    startAt: parseReservationTimeForDate(date, startTime),
    endAt: parseReservationEndTimeForDate(date, endTime),
  };
}

/** The booked slot is over. Hosts who never pressed Check In or No Show lose those buttons from here on. */
export function hasSessionEnded(session: SessionTimes): boolean {
  const { endAt } = sessionWindow(session);
  return Boolean(endAt && (session.now ?? new Date()).getTime() >= endAt.getTime());
}

/** Check-in is open from 30 minutes before the start until the booked slot ends. */
export function canCheckInNow(session: SessionTimes): boolean {
  const { startAt, endAt } = sessionWindow(session);
  if (!startAt || !endAt) return false;
  const now = (session.now ?? new Date()).getTime();
  return now >= startAt.getTime() - THIRTY_MINUTES_MS && now < endAt.getTime();
}

/** No-show can be marked from 30 minutes after the start until the booked slot ends. */
export function canMarkNoShowNow(session: SessionTimes): boolean {
  const { startAt, endAt } = sessionWindow(session);
  if (!startAt || !endAt) return false;
  const now = (session.now ?? new Date()).getTime();
  return now >= startAt.getTime() + THIRTY_MINUTES_MS && now < endAt.getTime();
}
