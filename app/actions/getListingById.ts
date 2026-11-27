"use server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { isListingPublic, previewTokenStatus } from "@/lib/listing/preview";
import { ListingService } from "@/lib/listing/service";
import { FullListing } from "@/types/listing";

interface IParams {
  listingId?: string;
  previewToken?: string;
}

export type ListingAccess =
  | { status: "granted"; listing: FullListing }
  | { status: "preview-expired"; title: string };

export async function getListingAccess(params: IParams): Promise<ListingAccess | null> {
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

    if (isListingPublic(listing)) return { status: "granted", listing };
    if (currentUser && (currentUser.role === "ADMIN" || listing.userId === currentUser.id)) return { status: "granted", listing };

    const preview = previewTokenStatus(listing.id, previewToken);
    if (preview === "valid") return { status: "granted", listing };
    if (preview === "expired") return { status: "preview-expired", title: listing.title };

    return null;
  } catch (error: unknown) {
    console.error(
      "[getListingAccess] Error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return null;
  }
}

export default async function getListingById(params: IParams): Promise<FullListing | null> {
  const access = await getListingAccess(params);
  return access?.status === "granted" ? access.listing : null;
}
