"use server";

import { Prisma } from "@prisma/client";

import prisma from "@/lib/prismadb";
import { Addon } from "@/types/addon";
import { ActualLocation, FullListing } from "@/types/listing";

type ListingWithRelations = Prisma.ListingGetPayload<{
  include: {
    user: true;
    packages: true;
    sets: true;
    blocks: true;
  };
}>;

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
        packages: true,
        sets: {
          orderBy: {
            position: "asc",
          },
        },
        blocks: true,
      },
    });

    if (!listing) {
      return null;
    }

    const l = listing as ListingWithRelations;

    return {
      ...l,
      createdAt: l.createdAt.toISOString(),
      amenities: (l.amenities as string[]) || [],
      addons: castJson<Addon[]>(l.addons, []),
      packages: l.packages?.map((pkg) => ({
        ...pkg,
        createdAt: pkg.createdAt.toISOString(),
      })) || [],
      operationalDays: castJson<{ start?: string; end?: string } | undefined>(l.operationalDays, undefined),
      operationalHours: castJson<{ start?: string; end?: string } | undefined>(l.operationalHours, undefined),
      actualLocation: castJson<ActualLocation | null>(l.actualLocation, null),
      sets: l.sets?.map((set) => ({
        ...set,
        createdAt: set.createdAt.toISOString(),
        updatedAt: set.updatedAt.toISOString(),
      })) || [],
      blocks: l.blocks?.map((block) => ({
        ...block,
        date: block.date.toISOString(),
        createdAt: block.createdAt.toISOString(),
      })) || [],
      carpetArea: l.carpetArea ? Number(l.carpetArea) : undefined,
      maximumPax: l.maximumPax ? Number(l.maximumPax) : undefined,
      minimumBookingHours: l.minimumBookingHours ? Number(l.minimumBookingHours) : undefined,
      avgReviewRating: l.avgReviewRating ?? undefined,
      instantBooking: l.instantBooking ?? undefined,
      user: {
        ...l.user,
        createdAt: l.user.createdAt.toISOString(),
        updatedAt: l.user.updatedAt.toISOString(),
        emailVerified: l.user.emailVerified?.toISOString() || null,
        verified_at: l.user.verified_at
          ? l.user.verified_at.toISOString()
          : null,
        markedForDeletionAt: l.user.markedForDeletionAt
          ? l.user.markedForDeletionAt.toISOString()
          : null,
      },
    };
  } catch (error: unknown) {
    console.error("[getListingById] Error:", error instanceof Error ? error.message : "Unknown error");
    return null;
  }
}
