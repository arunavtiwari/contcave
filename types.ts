// types.ts
import { Listing, Reservation, User } from "@prisma/client";

export type safeListing = Omit<Listing, "createdAt"> & {
  createdAt: string;
};

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

export type SafeUser = Omit<
  User,
  "createdAt" | "updatedAt" | "emailVerified" | "verified_at"
> & {
  createdAt: string;
  updatedAt: string;
  emailVerified: string | null;
  verified_at: string | null;
  googleCalendarConnected: boolean;
  markedForDeletion: boolean;
  markedForDeletionAt: string | null;
};
