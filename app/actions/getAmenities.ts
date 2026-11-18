"use server";

import { unstable_cache } from "next/cache";

import { STUDIOS_TAG } from "@/lib/listing/cacheTags";
import prisma from "@/lib/prismadb";
import { SafeAmenity } from "@/types/amenity";

const AMENITIES_CACHE_SECONDS = 3600;

const loadAmenities = unstable_cache(
  async (): Promise<SafeAmenity[]> => {
    const amenities = await prisma.amenities.findMany({ orderBy: { name: "asc" } });
    return amenities.map((amenity) => ({ ...amenity, createdAt: amenity.createdAt.toISOString() }));
  },
  ["amenities-v1"],
  { revalidate: AMENITIES_CACHE_SECONDS, tags: [STUDIOS_TAG] }
);

export default async function getAmenities(): Promise<SafeAmenity[]> {
  try {
    return await loadAmenities();
  } catch (error) {
    console.error("[getAmenities] Error:", error instanceof Error ? error.message : "Unknown error");
    return [];
  }
}
