import { Prisma, Reservation } from "@prisma/client";

import { safeListing } from "./listing";

export type SafeReservation = Omit<
    Reservation,
    "createdAt" | "startDate" | "endDate" | "listing" | "markedForDeletionAt" | "pricingSnapshot"
> & {
    createdAt: string;
    startDate: Date;
    startTime: string;
    endTime: string;
    listing: safeListing;
    markedForDeletionAt: string | null;
    rejectReason?: string | null;
    setIds?: string[];
    includedSetId?: string | null;
    setPackageId?: string | null;
    pricingSnapshot?: Prisma.JsonValue | null;
    totalPriceInt?: number | null;
};
