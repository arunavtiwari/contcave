"use server";

import prisma from "@/lib/prismadb";
import { SafeAmenity } from "@/types/amenity";

export default async function getAmenities(): Promise<SafeAmenity[]> {
  try {
    const amenities = await prisma.amenities.findMany({
      orderBy: { name: "asc" },
    });

    return amenities.map((amenity) => ({ ...amenity, createdAt: amenity.createdAt.toISOString() }));
  } catch (error) {
    console.error("[getAmenities] Error:", error instanceof Error ? error.message : "Unknown error");
    return [];
  }
}
