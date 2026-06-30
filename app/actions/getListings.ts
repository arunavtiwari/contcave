"use server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { ListingService } from "@/lib/listing/service";

export interface IListingsParams {
  userId?: string;
  startDate?: string;
  endDate?: string;
  locationValue?: string;
  category?: string;
  type?: string;
  hasSets?: string;
  latitude?: string;
  longitude?: string;
}

export default async function getListings(params: IListingsParams) {
  try {
    const safeListings = await ListingService.getListings({
      ...params,
      hasSets: params.hasSets === "true",
      latitude: params.latitude ? Number(params.latitude) : undefined,
      longitude: params.longitude ? Number(params.longitude) : undefined,
    });

    const currentUser = await getCurrentUser();

    // Strip exact coordinates from public feeds to prevent triangulation
    safeListings.forEach(listing => {
      let isAuthorized = false;
      if (currentUser && (listing.user.id === currentUser.id || currentUser.role === "ADMIN")) {
        isAuthorized = true;
      }

      if (listing.actualLocation) {
        if (isAuthorized && listing.actualLocation.exactLatlng) {
          listing.actualLocation.latlng = listing.actualLocation.exactLatlng;
          listing.actualLocation.lat = listing.actualLocation.exactLatlng[0];
          listing.actualLocation.lng = listing.actualLocation.exactLatlng[1];
          listing.actualLocation.isExact = true;
        } else {
          listing.actualLocation.isExact = false;
        }
        delete listing.actualLocation.exactLatlng;
      }
    });

    return safeListings;
  } catch (error: unknown) {
    throw new Error(error instanceof Error ? error.message : "An unknown error occurred");
  }
}
