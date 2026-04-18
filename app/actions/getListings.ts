"use server";

import { ListingService } from "@/lib/listing/service";

export interface IListingsParams {
  userId?: string;
  startDate?: string;
  endDate?: string;
  locationValue?: string;
  category?: string;
  type?: string;
  hasSets?: string;
}

export default async function getListings(params: IListingsParams) {
  try {
    const safeListings = await ListingService.getListings({
      ...params,
      hasSets: params.hasSets === "true",
    });

    return safeListings;
  } catch (error: unknown) {
    throw new Error(error instanceof Error ? error.message : "An unknown error occurred");
  }
}
