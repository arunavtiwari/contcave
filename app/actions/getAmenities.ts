import prisma from "@/lib/prismadb";
import { Amenities, Prisma } from '@prisma/client';



export default async function getAmenities(): Promise<Amenities[]> {
  try {
    let query: Prisma.AmenitiesWhereInput = {}; // Use Prisma type for query
    const amenities: any[] = [
      {
        "id": "65b2ac4116d8d0003b5c6e12",
        "name": "Lighting Equipment",
        "createdAt": "2024-01-25T18:45:21.478Z"
      },
      {
        "id": "65b2ac9616d8d0003b5c6e13",
        "name": "Blackout blinds",
        "createdAt": "2024-01-25T18:46:46.102Z"
      },
      {
        "id": "65b2aca316d8d0003b5c6e14",
        "name": "White Backdrop",
        "createdAt": "2024-01-25T18:46:59.811Z"
      },
      {
        "id": "65b2acb316d8d0003b5c6e15",
        "name": "Sandbags",
        "createdAt": "2024-01-25T18:47:15.764Z"
      },
      {
        "id": "65b2acc816d8d0003b5c6e16",
        "name": "Tables",
        "createdAt": "2024-01-25T18:47:36.521Z"
      },
      {
        "id": "65b2acd616d8d0003b5c6e17",
        "name": "Chairs",
        "createdAt": "2024-01-25T18:47:50.113Z"
      },
      {
        "id": "65b2ace316d8d0003b5c6e18",
        "name": "Wardrobe Rack",
        "createdAt": "2024-01-25T18:48:03.358Z"
      },
      {
        "id": "65b2acf116d8d0003b5c6e19",
        "name": "Video Equipment",
        "createdAt": "2024-01-25T18:48:17.044Z"
      },
      {
        "id": "65b2acff16d8d0003b5c6e1a",
        "name": "Green Screen",
        "createdAt": "2024-01-25T18:48:31.774Z"
      },
      {
        "id": "65b2ad1016d8d0003b5c6e1b",
        "name": "WiFi",
        "createdAt": "2024-01-25T18:48:48.509Z"
      },
      {
        "id": "65b2ad2016d8d0003b5c6e1c",
        "name": "Steamer",
        "createdAt": "2024-01-25T18:49:04.352Z"
      },
      {
        "id": "65b2ad2e16d8d0003b5c6e1d",
        "name": "Natural Light",
        "createdAt": "2024-01-25T18:49:18.076Z"
      },
      {
        "id": "65b2ad3c16d8d0003b5c6e1e",
        "name": "Restrooms",
        "createdAt": "2024-01-25T18:49:32.544Z"
      }
    ]
    if (!amenities || !amenities.length) {
      return [];
    }
    const safeAmenities: Amenities[] = amenities.map((list) => ({
      id: list.id,
      name: list.name,
      createdAt: list.createdAt instanceof Date ? list.createdAt.toISOString() : list.createdAt as string,
    }));

    return safeAmenities;
  } catch (error: any) {
    throw new Error(error.message);
  }
}
