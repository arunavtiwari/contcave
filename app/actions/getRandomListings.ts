"use server";

import { ListingService } from "@/lib/listing/service";
import { FullListing } from "@/types/listing";

export default async function getRandomListings(limit: number = 3): Promise<FullListing[]> {
    try {
        return await ListingService.getRandomListings(limit);
    } catch (error: unknown) {
        console.error("[getRandomListings] Error:", error instanceof Error ? error.message : "Unknown error");
        return [];
    }
}
