"use server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { isListingPublic, isValidListingPreviewToken } from "@/lib/listing/preview";
import { ListingService } from "@/lib/listing/service";
import { FullListing } from "@/types/listing";

interface IParams {
  listingId?: string;
  previewToken?: string;
}

export default async function getListingById(params: IParams): Promise<FullListing | null> {
  try {
    const { listingId, previewToken } = params;

    if (!listingId) {
      return null;
    }

    const currentUser = await getCurrentUser();
    const listing = await ListingService.findById(listingId, currentUser
      ? { id: currentUser.id, role: currentUser.role }
      : undefined);
    if (!listing) return null;

    if (isListingPublic(listing)) return listing;
    if (currentUser && (currentUser.role === "ADMIN" || listing.userId === currentUser.id)) return listing;
    if (isValidListingPreviewToken(listing.id, previewToken)) return listing;

    return null;
  } catch (error: unknown) {
    console.error(
      "[getListingById] Error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return null;
  }
}
