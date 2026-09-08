"use server";



import getCurrentUser from "@/app/actions/getCurrentUser";
import { ListingService } from "@/lib/listing/service";

export default async function getFavoriteListings() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return [];
    }

    return await ListingService.getFavoriteListings(currentUser.favoriteIds || []);
  } catch (error: unknown) {
    console.error("[getFavoriteListings] Failed to load favorites", error);
    return [];
  }
}
