import { Prisma } from "@prisma/client";

import { parseTimeToMinutes } from "@/lib/availability";
import { dateKeyOf, minutesToClock, SLOT_MINUTES } from "@/lib/booking/dayAvailability";
import { asEndOfDayMinutes } from "@/lib/scheduling";

// Slot rows for a listing booked as a whole rather than per set.
export const LISTING_WIDE_SLOT_ID = "__LISTING__";

// The ReservationSlot unique index is what makes double booking impossible, so
// a conflict on it means the requested time was taken, not that the write failed.
export function isReservationSlotUniqueConflict(error: unknown) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") return false;
    const metadata = JSON.stringify(error.meta || {}).toLowerCase();
    return metadata.includes("reservationslot")
        || metadata.includes("slotkey")
        || metadata.includes("datekey");
}

export function reservationSlotRows(params: {
    listingId: string;
    reservationId: string;
    startDate: Date;
    startTime: string;
    endTime: string;
    setIds: string[];
}): Prisma.ReservationSlotCreateManyInput[] | null {
    const start = parseTimeToMinutes(params.startTime);
    const end = asEndOfDayMinutes(parseTimeToMinutes(params.endTime));
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;

    const dateKey = dateKeyOf(params.startDate);
    const setIds = params.setIds.length > 0 ? Array.from(new Set(params.setIds)) : [LISTING_WIDE_SLOT_ID];
    const rows: Prisma.ReservationSlotCreateManyInput[] = [];

    for (let cursor = start; cursor < end; cursor += SLOT_MINUTES) {
        const slotKey = minutesToClock(cursor);
        for (const setId of setIds) {
            rows.push({ listingId: params.listingId, reservationId: params.reservationId, dateKey, slotKey, setId });
        }
    }

    return rows;
}
