import { Prisma, PrismaClient } from "@prisma/client";

import {
    checkExtensionWindow,
    checkWindow,
    type DayAvailability,
    dayAvailabilityFromRecords,
    isDateKey,
} from "@/lib/booking/dayAvailability";
import { fetchListingCalendarEvents } from "@/lib/calendar/fetchEvents";
import prisma from "@/lib/prismadb";
import { ACTIVE_RESERVATION_STATUSES } from "@/lib/reservation/status";
import { asEndOfDayMinutes, labelToMinutes } from "@/lib/scheduling";

type Db = Prisma.TransactionClient | PrismaClient;

type RawId = string | { $oid?: string };
type RawReservation = { listingId?: RawId; startTime?: string; endTime?: string; setIds?: RawId[] };

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

const readRawId = (value: RawId | undefined) => (typeof value === "string" ? value : value?.$oid ?? "");

const dayBounds = (date: string) => ({
    start: new Date(`${date}T00:00:00.000Z`),
    end: new Date(`${date}T23:59:59.999Z`),
});

export async function loadDayAvailabilities(params: {
    listingIds: string[];
    date: string;
    db?: Db;
    excludeReservationId?: string;
    includeCalendar?: boolean;
    now?: Date;
}): Promise<Map<string, DayAvailability>> {
    const { listingIds, date, db = prisma, excludeReservationId, includeCalendar = false, now = new Date() } = params;
    const result = new Map<string, DayAvailability>();
    if (listingIds.length === 0 || !isDateKey(date)) return result;

    const bounds = dayBounds(date);
    const [listings, dayStatuses, blocks, reservations] = await Promise.all([
        db.listing.findMany({
            where: { id: { in: listingIds } },
            select: {
                id: true,
                operationalDays: true,
                operationalHours: true,
                minimumBookingHours: true,
                hasSets: true,
                sets: { select: { id: true } },
            },
        }),
        db.dayStatus.findMany({
            where: { listingId: { in: listingIds }, date: bounds.start },
            select: { listingId: true, listingActive: true, startTime: true, endTime: true },
        }),
        db.listingBlock.findMany({
            where: { listingId: { in: listingIds }, date: { gte: bounds.start, lte: bounds.end } },
            select: { listingId: true, startTime: true, endTime: true, setIds: true },
        }),
        db.reservation.findRaw({
            filter: {
                listingId: { $in: listingIds.map((id) => ({ $oid: id })) },
                startDate: { $gte: { $date: bounds.start.toISOString() }, $lte: { $date: bounds.end.toISOString() } },
                markedForDeletion: false,
                $or: [{ status: { $in: ACTIVE_RESERVATION_STATUSES } }, { status: { $exists: false } }],
                ...(excludeReservationId ? { _id: { $ne: { $oid: excludeReservationId } } } : {}),
            },
            options: { projection: { listingId: 1, startTime: 1, endTime: 1, setIds: 1 } },
        }) as unknown as Promise<RawReservation[]>,
    ]);

    const byListing = <T extends { listingId: string }>(rows: T[], listingId: string) =>
        rows.filter((row) => row.listingId === listingId);
    const bookings = reservations.map((row) => ({
        listingId: readRawId(row.listingId),
        date,
        startTime: row.startTime ?? "",
        endTime: row.endTime ?? "",
        setIds: (row.setIds ?? []).map(readRawId).filter(Boolean),
    }));
    const calendarEvents = includeCalendar
        ? await Promise.all(listings.map((listing) => fetchListingCalendarEvents(listing.id)))
        : [];

    listings.forEach((listing, index) => {
        result.set(listing.id, dayAvailabilityFromRecords({
            date,
            listing: {
                operationalDays: listing.operationalDays,
                operationalHours: listing.operationalHours,
                minimumBookingHours: listing.minimumBookingHours,
                hasSets: listing.hasSets,
                setIds: listing.sets.map((set) => set.id),
            },
            dayStatuses: byListing(dayStatuses, listing.id).map((status) => ({ ...status, date })),
            reservations: byListing(bookings, listing.id),
            blocks: byListing(blocks, listing.id).map((block) => ({ ...block, date })),
            calendarEvents: calendarEvents[index] ?? [],
            now,
        }));
    });

    return result;
}

export async function loadDayAvailability(params: {
    listingId: string;
    date: string;
    db?: Db;
    excludeReservationId?: string;
    includeCalendar?: boolean;
}) {
    const { listingId, ...rest } = params;
    return (await loadDayAvailabilities({ ...rest, listingIds: [listingId] })).get(listingId) ?? null;
}

type SlotParams = {
    listingId: string;
    date: string;
    startTime: string;
    endTime: string;
    setIds: string[];
    excludeReservationId?: string;
    db?: Db;
    includeCalendar?: boolean;
};

async function checkSlot(
    params: SlotParams,
    check: (day: DayAvailability, window: { start: number; end: number; setIds: string[] }) => string | null
): Promise<string | null> {
    if (!isDateKey(params.date)) return "Please choose a valid booking date.";
    const day = await loadDayAvailability(params);
    if (!day) return "Listing not found";

    return check(day, {
        start: labelToMinutes(params.startTime),
        end: asEndOfDayMinutes(labelToMinutes(params.endTime)),
        setIds: params.setIds,
    });
}

export const checkBookingSlot = (params: SlotParams & { packageDurationHours?: number | null }) =>
    checkSlot(params, (day, window) => checkWindow(day, {
        ...window,
        packageMinutes: Math.max(0, Number(params.packageDurationHours || 0)) * 60,
    }));

export const checkExtensionSlot = (params: SlotParams) => checkSlot(params, checkExtensionWindow);
