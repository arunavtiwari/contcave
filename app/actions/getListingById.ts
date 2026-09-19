"use server";

import getCurrentUser from "@/app/actions/getCurrentUser";
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

    const currentUser = await getCurrentUser();
    const listing = await ListingService.findById(listingId, currentUser
      ? { id: currentUser.id, role: currentUser.role }
      : undefined);
    if (!listing) return null;

    if (listing.active && (listing.status === "VERIFIED" || listing.listingType === "CURATED")) {
      return listing;
    }

    if (currentUser && (currentUser.role === "ADMIN" || listing.userId === currentUser.id)) {
      return listing;
    }

    return null;
  } catch (error: unknown) {
    console.error(
      "[getListingById] Error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return null;
  }
}


// Existence is checked without resolving the session so the page can answer a
// real 404 before its Suspense fallback flushes the response at 200.
export async function listingExists(listingId?: string): Promise<boolean> {
  if (!listingId) return false;
  try {
    return await ListingService.exists(listingId);
  } catch (error: unknown) {
    console.error(
      "[listingExists] Error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return true;
  }
}
