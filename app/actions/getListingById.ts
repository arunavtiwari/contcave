"use server";

import prisma from "@/lib/prismadb";
import { Addon } from "@/types/addon";
import { ActualLocation,FullListing } from "@/types/listing";
import { Package } from "@/types/package";

interface IParams {
  listingId?: string;
}

const castJson = <T>(value: unknown, fallback: T): T => {
  if (value === null || value === undefined) return fallback;
  return value as T;
};

export default async function getListingById(params: IParams): Promise<FullListing | null> {
  try {
    const { listingId } = params;

    if (!listingId) {
      return null;
    }

    const listing = await prisma.listing.findUnique({
      where: {
        id: listingId,
      },
      include: {
        user: true,
        packages: true
      },
    });

    if (!listing) {
      return null;
    }

    return {
      ...listing,
      createdAt: listing.createdAt.toISOString(),
      amenities: (listing.amenities as string[]) || [],
      addons: castJson<Addon[]>(listing.addons, []),
      packages: castJson<Package[]>(listing.packages, []),
      operationalDays: castJson<{ start?: string; end?: string } | undefined>(listing.operationalDays, undefined),
      operationalHours: castJson<{ start?: string; end?: string } | undefined>(listing.operationalHours, undefined),
      actualLocation: castJson<ActualLocation | null>(listing.actualLocation, null),
      carpetArea: listing.carpetArea ? Number(listing.carpetArea) : undefined,
      maximumPax: listing.maximumPax ? Number(listing.maximumPax) : undefined,
      minimumBookingHours: listing.minimumBookingHours ? Number(listing.minimumBookingHours) : undefined,
      avgReviewRating: listing.avgReviewRating ?? undefined,
      instantBooking: listing.instantBooking ?? undefined,
      user: {
        ...listing.user,
        createdAt: listing.user.createdAt.toISOString(),
        updatedAt: listing.user.updatedAt.toISOString(),
        emailVerified: listing.user.emailVerified?.toISOString() || null,
        verified_at: listing.user.verified_at
          ? listing.user.verified_at.toISOString()
          : null,
        markedForDeletionAt: listing.user.markedForDeletionAt
          ? listing.user.markedForDeletionAt.toISOString()
          : null,
      },
    };
  } catch (error: unknown) {
    console.error("[getListingById] Error:", error instanceof Error ? error.message : "Unknown error");
    return null;
  }
}
