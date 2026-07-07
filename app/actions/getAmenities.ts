"use server";

import { Amenities } from "@prisma/client";

import prisma from "@/lib/prismadb";

const FALLBACK_AMENITIES: Array<Pick<Amenities, "id" | "name" | "icon" | "createdAt">> = [
  { id: "65b2aca316d8d0003b5c6e14", name: "Air Conditioner", icon: null, createdAt: new Date("2024-01-25T18:46:59.811Z") },
  { id: "65b2ac9616d8d0003b5c6e13", name: "Blackout blinds", icon: null, createdAt: new Date("2024-01-25T18:46:46.102Z") },
  { id: "65b2acd616d8d0003b5c6e17", name: "Chairs", icon: null, createdAt: new Date("2024-01-25T18:47:50.113Z") },
  { id: "65b2acf116d8d0003b5c6e19", name: "Changing Room", icon: null, createdAt: new Date("2024-01-25T18:48:17.044Z") },
  { id: "65b2ad2016d8d0003b5c6e1c", name: "Coffee Machine", icon: null, createdAt: new Date("2024-01-25T18:49:04.352Z") },
  { id: "65b2acb316d8d0003b5c6e15", name: "Lift", icon: null, createdAt: new Date("2024-01-25T18:47:15.764Z") },
  { id: "65b2ad2e16d8d0003b5c6e1d", name: "Natural Light", icon: null, createdAt: new Date("2024-01-25T18:49:18.076Z") },
  { id: "65b2ace316d8d0003b5c6e18", name: "Nearby Parking", icon: null, createdAt: new Date("2024-01-25T18:48:03.358Z") },
  { id: "65b2ad3c16d8d0003b5c6e1e", name: "Restroom", icon: null, createdAt: new Date("2024-01-25T18:49:32.544Z") },
  { id: "65e09cdbfb2b11bc2cbe02c3", name: "Security Cameras", icon: null, createdAt: new Date("2024-01-25T18:49:32.544Z") },
  { id: "65b2acc816d8d0003b5c6e16", name: "Table", icon: null, createdAt: new Date("2024-01-25T18:47:36.521Z") },
  { id: "65b2acff16d8d0003b5c6e1a", name: "Wardrobe Rack", icon: null, createdAt: new Date("2024-01-25T18:48:31.774Z") },
  { id: "65b2ac4116d8d0003b5c6e12", name: "Well Lit Space", icon: null, createdAt: new Date("2024-01-25T18:45:21.478Z") },
  { id: "68aafdb5e2853bc5f5c45cd9", name: "Wifi", icon: null, createdAt: new Date("2026-05-14T12:11:52.578Z") },
];

export default async function getAmenities(): Promise<Amenities[]> {
  try {
    const amenities = await prisma.amenities.findMany({
      orderBy: { name: "asc" },
    });

    return amenities.length > 0 ? amenities : FALLBACK_AMENITIES as Amenities[];
  } catch (error) {
    console.error("[getAmenities] Error:", error instanceof Error ? error.message : "Unknown error");
    return FALLBACK_AMENITIES as Amenities[];
  }
}
