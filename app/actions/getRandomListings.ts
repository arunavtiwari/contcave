"use server";

import { ListingService } from "@/lib/listing/service";
import { FullListing } from "@/types/listing";

export default async function getRandomListings(limit: number = 3): Promise<FullListing[]> {
    try {
        const listings = await ListingService.getRandomListings(limit);

        // Strip exact coordinates from public feeds to prevent triangulation
        listings.forEach(listing => {
            if (listing.actualLocation) {
                listing.actualLocation.isExact = false;
                delete listing.actualLocation.exactLatlng;
            }
        });

        return listings;
    } catch (error: unknown) {
        console.error("[getRandomListings] Error:", error instanceof Error ? error.message : "Unknown error");
        return [];
    }
}
