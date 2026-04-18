"use server";



import { Amenities } from '@prisma/client';

interface AmenityData {
  id: string | number;
  name: string;
  iconName?: string;
  createdAt?: string | Date;
}

const AMENITIES_DATA: AmenityData[] = [
  { id: "65b2ac4116d8d0003b5c6e12", name: "Lighting Equipment", iconName: "FaLightbulb", createdAt: "2024-01-25T18:45:21.478Z" },
  { id: "65b2ac9616d8d0003b5c6e13", name: "Blackout blinds", iconName: "", createdAt: "2024-01-25T18:46:46.102Z" },
  { id: "65b2aca316d8d0003b5c6e14", name: "White Backdrop", iconName: "", createdAt: "2024-01-25T18:46:59.811Z" },
  { id: "65b2acb316d8d0003b5c6e15", name: "Sandbags", iconName: "", createdAt: "2024-01-25T18:47:15.764Z" },
  { id: "65b2acc816d8d0003b5c6e16", name: "Tables", iconName: "MdTableRestaurant", createdAt: "2024-01-25T18:47:36.521Z" },
  { id: "65b2acd616d8d0003b5c6e17", name: "Chairs", iconName: "FaChair", createdAt: "2024-01-25T18:47:50.113Z" },
  { id: "65b2ace316d8d0003b5c6e18", name: "Wardrobe Rack", iconName: "", createdAt: "2024-01-25T18:48:03.358Z" },
  { id: "65b2acf116d8d0003b5c6e19", name: "Video Equipment", iconName: "", createdAt: "2024-01-25T18:48:17.044Z" },
  { id: "65b2acff16d8d0003b5c6e1a", name: "Green Screen", createdAt: "2024-01-25T18:48:31.774Z" },
  { id: "65b2ad1016d8d0003b5c6e1b", name: "WiFi", iconName: "FaWifi", createdAt: "2024-01-25T18:48:48.509Z" },
  { id: "65b2ad2016d8d0003b5c6e1c", name: "Steamer", iconName: "", createdAt: "2024-01-25T18:49:04.352Z" },
  { id: "65b2ad2e16d8d0003b5c6e1d", name: "Natural Light", iconName: "FaSun", createdAt: "2024-01-25T18:49:18.076Z" },
  { id: "65b2ad3c16d8d0003b5c6e1e", name: "Restrooms", iconName: "TbAirConditioning", createdAt: "2024-01-25T18:49:32.544Z" },
  { id: 2, name: "Garden view", iconName: "GiButterflyFlower" },
  { id: 3, name: "Hot water", iconName: "BsFire" },
  { id: 4, name: "Coffee", iconName: "MdOutlineCoffeeMaker" },
  { id: 5, name: "Security cameras", iconName: "BiCctv" },
  { id: 6, name: "Bathtub", iconName: "MdOutlineBathtub" },
  { id: 7, name: "Dedicated workspace", iconName: "GrWorkshop" },
  { id: 8, name: "Safe", iconName: "RiSafeLine" },
  { id: 9, name: "Free parking", iconName: "AiOutlineCar" },
  { id: 10, name: "Fire extinguisher", iconName: "FaFireExtinguisher" },
];

export default async function getAmenities(): Promise<Amenities[]> {
  try {
    const safeAmenities: Amenities[] = AMENITIES_DATA.map((amenity) => ({
      id: String(amenity.id),
      name: amenity.name,
      icon: amenity.iconName || null,
      createdAt: amenity.createdAt instanceof Date
        ? amenity.createdAt
        : amenity.createdAt
          ? new Date(amenity.createdAt)
          : new Date(),
    }));

    return safeAmenities;
  } catch (error) {
    console.error('[getAmenities] Error:', error instanceof Error ? error.message : 'Unknown error');
    return [];
  }
}
