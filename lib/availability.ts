import { Prisma, PrismaClient } from "@prisma/client";

import { fetchListingCalendarEvents } from "@/lib/calendar/fetchEvents";
import prisma from "@/lib/prismadb";
import { asEndOfDayMinutes } from "@/lib/scheduling";


export function parseTimeToMinutes(timeStr: string): number {
    if (!timeStr) return Number.NaN;

    const m12 = timeStr.match(/^\s*(\d{1,2}):(\d{2})\s*(AM|PM)\s*$/i);
    if (m12) {
        let h = parseInt(m12[1], 10);
        const min = parseInt(m12[2], 10);
        const period = m12[3].toUpperCase();
        if (h < 1 || h > 12 || min < 0 || min > 59) return Number.NaN;
        if (period === "PM" && h < 12) h += 12;
        if (period === "AM" && h === 12) h = 0;
        return h * 60 + min;
    }

    const m24 = timeStr.match(/^\s*([01]?\d|2[0-3]):([0-5]\d)\s*$/);
    if (m24) {
        return parseInt(m24[1], 10) * 60 + parseInt(m24[2], 10);
    }

    return Number.NaN;
}


export function checkTimeOverlap(
    existingStart: number,
    existingEnd: number,
    requestedStart: number,
    requestedEnd: number
): boolean {
    return existingStart < requestedEnd && requestedStart < existingEnd;
}


export function hasSetIntersection(setIds1: string[], setIds2: string[]): boolean {
    if (setIds1.length === 0 || setIds2.length === 0) return false;
    const set1 = new Set(setIds1);
    return setIds2.some((id) => set1.has(id));
}

export interface ConflictCheckParams {
    listingId: string;
    date: Date;
    startTime: string;
    endTime: string;
    setIds: string[];
    excludeReservationId?: string;
    tx?: Prisma.TransactionClient | PrismaClient;
    skipGoogleCalendar?: boolean;
}

export interface ConflictResult {
    hasConflict: boolean;
    conflictType?: "block" | "reservation";
    conflictDetails?: string;
}


export async function checkSetConflicts(
    params: ConflictCheckParams
): Promise<ConflictResult> {
    const { listingId, date, startTime, endTime, setIds, excludeReservationId, tx, skipGoogleCalendar } = params;
    const db = tx || prisma;

    const requestedStart = parseTimeToMinutes(startTime);
    const requestedEnd = asEndOfDayMinutes(parseTimeToMinutes(endTime));
    if (!Number.isFinite(date.getTime()) || !Number.isFinite(requestedStart) || !Number.isFinite(requestedEnd) || requestedEnd <= requestedStart) {
        return { hasConflict: true, conflictType: "block", conflictDetails: "Invalid booking time range." };
    }

    const dateStart = new Date(date);
    dateStart.setUTCHours(0, 0, 0, 0);
    const dateEnd = new Date(date);
    dateEnd.setUTCHours(23, 59, 59, 999);

    const ymd = date.toISOString().slice(0, 10);
    const bookingDayStartAbs = new Date(`${ymd}T00:00:00+05:30`).getTime();
    const reqStartAbs = bookingDayStartAbs + requestedStart * 60_000;
    const reqEndAbs = bookingDayStartAbs + requestedEnd * 60_000;

    const listing = await db.listing.findUnique({
        where: { id: listingId },
        select: { hasSets: true },
    });

    const [blocks, reservations] = await Promise.all([
        db.listingBlock.findMany({
            where: {
                listingId,
                date: { gte: dateStart, lte: dateEnd },
            },
        }),
        db.reservation.findMany({
            where: {
                listingId,
                startDate: { gte: dateStart, lte: dateEnd },
                markedForDeletion: false,
                status: { in: ["PENDING_APPROVAL", "CONFIRMED", "CHECKED_IN"] },
                ...(excludeReservationId ? { id: { not: excludeReservationId } } : {}),
            },
            select: {
                id: true,
                startTime: true,
                endTime: true,
                setIds: true,
            },
        }),
    ]);

    for (const block of blocks) {
        const blockStart = parseTimeToMinutes(block.startTime);
        const blockEnd = asEndOfDayMinutes(parseTimeToMinutes(block.endTime));
        if (!Number.isFinite(blockStart) || !Number.isFinite(blockEnd) || blockEnd <= blockStart) {
            return {
                hasConflict: true,
                conflictType: "block",
                conflictDetails: "This date has an invalid availability block. The host must correct it before booking.",
            };
        }

        if (!checkTimeOverlap(blockStart, blockEnd, requestedStart, requestedEnd)) {
            continue;
        }

        const isListingWide = !listing?.hasSets || !block.setIds || block.setIds.length === 0;
        if (isListingWide) {
            return {
                hasConflict: true,
                conflictType: "block",
                conflictDetails: "This time slot is blocked.",
            };
        }

        if (setIds.length > 0 && hasSetIntersection(block.setIds, setIds)) {
            return {
                hasConflict: true,
                conflictType: "block",
                conflictDetails: "Selected sets are blocked during this time.",
            };
        }
    }

    for (const reservation of reservations) {
        const resStart = parseTimeToMinutes(reservation.startTime);
        const resEnd = asEndOfDayMinutes(parseTimeToMinutes(reservation.endTime));
        if (!Number.isFinite(resStart) || !Number.isFinite(resEnd) || resEnd <= resStart) {
            return {
                hasConflict: true,
                conflictType: "reservation",
                conflictDetails: "This date has an existing booking with invalid timing data. Please contact support.",
            };
        }

        if (!checkTimeOverlap(resStart, resEnd, requestedStart, requestedEnd)) {
            continue;
        }

        if (!listing?.hasSets) {
            return {
                hasConflict: true,
                conflictType: "reservation",
                conflictDetails: "This time slot is already booked.",
            };
        }

        const resSetIds = reservation.setIds || [];
        const isLegacyReservation = resSetIds.length === 0;

        if (isLegacyReservation) {
            return {
                hasConflict: true,
                conflictType: "reservation",
                conflictDetails: "This time slot has an existing booking that blocks all sets.",
            };
        }

        if (setIds.length > 0 && hasSetIntersection(resSetIds, setIds)) {
            return {
                hasConflict: true,
                conflictType: "reservation",
                conflictDetails: "One or more selected sets are already booked during this time.",
            };
        }
    }

    if (skipGoogleCalendar) {
        return { hasConflict: false };
    }

    const googleEvents = await fetchListingCalendarEvents(listingId);
    for (const ev of googleEvents) {
        const sISO = ev?.start?.dateTime || ev?.start?.date;
        const eISO = ev?.end?.dateTime || ev?.end?.date;
        if (!sISO || !eISO) continue;

        let evStartMs, evEndMs;
        if (sISO.length === 10) {
            evStartMs = new Date(`${sISO}T00:00:00+05:30`).getTime();
            evEndMs = new Date(`${eISO}T00:00:00+05:30`).getTime();
        } else {
            evStartMs = new Date(sISO).getTime();
            evEndMs = new Date(eISO).getTime();
        }

        if (evStartMs < reqEndAbs && reqStartAbs < evEndMs) {
            return {
                hasConflict: true,
                conflictType: "block",
                conflictDetails: "This time slot overlaps with a connected Google Calendar event.",
            };
        }
    }

    return { hasConflict: false };
}

