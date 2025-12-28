import { Reservation } from "@prisma/client";
import { safeListing } from "./listing";

export type SafeReservation = Omit<
    Reservation,
    "createdAt" | "startDate" | "endDate" | "listing" | "markedForDeletionAt"
> & {
    createdAt: string;
    startDate: Date;
    startTime: string;
    endTime: string;
    listing: safeListing;
    markedForDeletionAt: string | null;
    rejectReason?: string | null;
};
