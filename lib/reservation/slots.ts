import { Prisma } from "@prisma/client";

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
