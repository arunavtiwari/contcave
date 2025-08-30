// types.ts
import { Listing, Reservation, User } from "@prisma/client";

/** unchanged */
export type safeListing = Omit<Listing, "createdAt"> & {
  createdAt: string;
};

/** unchanged shape for reservations */
export type SafeReservation = Omit<
  Reservation,
  "createdAt" | "startDate" | "endDate" | "listing"
> & {
  createdAt: string;
  startDate: Date;
  startTime: string;
  endTime: string;
  listing: safeListing;
};

export type SafeUser = Omit<User, "createdAt" | "updatedAt" | "emailVerified"> & {
  createdAt: string;
  updatedAt: string;
  emailVerified: string | null;
  googleCalendarConnected: boolean;
};
