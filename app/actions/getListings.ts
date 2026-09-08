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
  venueTypes?: string;
  aesthetics?: string;
  setFeatures?: string;
  hasSets?: string;
}

export default async function getListings(params: IListingsParams) {
  try {
    if (params.userId) {
      const currentUser = await getCurrentUser();
      if (!currentUser || (currentUser.id !== params.userId && currentUser.role !== "ADMIN")) {
        return [];
      }
    }

    const safeListings = await ListingService.getListings({
      ...params,
      hasSets: params.hasSets === "true",
    });

    return safeListings;
  } catch (error: unknown) {
    throw new Error(error instanceof Error ? error.message : "An unknown error occurred");
  }
}
