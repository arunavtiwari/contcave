"use server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { ListingService } from "@/lib/listing/service";
import prisma from "@/lib/prismadb";
import { FullListing } from "@/types/listing";

interface IParams {
  listingId?: string;
}

export default async function getListingById(params: IParams): Promise<FullListing | null> {
  try {
    const { listingId } = params;

    if (!listingId) {
      return null;
    }

    const listing = await ListingService.findById(listingId);
    if (!listing) return null;

    // Authorization check for exact location
    let isAuthorized = false;
    const currentUser = await getCurrentUser();

    if (currentUser) {
      if (listing.user.id === currentUser.id || currentUser.role === "ADMIN") {
        isAuthorized = true;
      } else {
        // Check for active reservations
        const hasReservation = await prisma.reservation.findFirst({
          where: {
            listingId: listing.id,
            userId: currentUser.id,
            isApproved: 1 // 1 means confirmed
          }
        });
        if (hasReservation) {
          isAuthorized = true;
        }
      }
    }

    if (listing.actualLocation) {
      if (isAuthorized && listing.actualLocation.exactLatlng) {
        // User is authorized, give them the exact coordinates
        listing.actualLocation.latlng = listing.actualLocation.exactLatlng;
        listing.actualLocation.lat = listing.actualLocation.exactLatlng[0];
        listing.actualLocation.lng = listing.actualLocation.exactLatlng[1];
        listing.actualLocation.isExact = true;
      } else {
        // Unauthorized (public feed), strip the exact coordinates
        listing.actualLocation.isExact = false;
      }
      
      // Always strip exactLatlng from the network payload for security
      delete listing.actualLocation.exactLatlng;
    }

    return listing;
  } catch (error: unknown) {
    console.error(
      "[getListingById] Error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return null;
  }
}
