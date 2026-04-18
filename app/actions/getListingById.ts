"use server";

import { ListingService } from "@/lib/listing/service";
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

    return await ListingService.findById(listingId);
  } catch (error: unknown) {
    console.error(
      "[getListingById] Error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return null;
  }
}
