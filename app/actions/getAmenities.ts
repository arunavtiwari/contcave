import prisma from "@/lib/prismadb";
import { Amenities, Prisma } from '@prisma/client';
import { AiOutlineCar, AiOutlineWifi } from "react-icons/ai";
import { BiCctv } from "react-icons/bi";
import { BsFire } from "react-icons/bs";
import { FaChair, FaFireExtinguisher, FaLightbulb, FaSun, FaWifi } from "react-icons/fa";
import { GiButterflyFlower } from "react-icons/gi";
import { GrWorkshop } from "react-icons/gr";
import { MdOutlineBathtub, MdOutlineCoffeeMaker, MdTableRestaurant } from "react-icons/md";
import { RiSafeLine } from "react-icons/ri";
import { TbAirConditioning } from "react-icons/tb";



export default async function getAmenities(fromPropertyClient:boolean = false): Promise<Amenities[]> {
  try {
    let query: Prisma.AmenitiesWhereInput = {}; // Use Prisma type for query
   const  amenities: any[] = [
      {
        "id": "65b2ac4116d8d0003b5c6e12",
        "name": "Lighting Equipment",
        "icon":FaLightbulb,
        "createdAt": "2024-01-25T18:45:21.478Z"
      },
      {
        "id": "65b2ac9616d8d0003b5c6e13",
        "name": "Blackout blinds",
        "icon":"",
        "createdAt": "2024-01-25T18:46:46.102Z"
      },
      {
        "id": "65b2aca316d8d0003b5c6e14",
        "name": "White Backdrop",
        "icon":"",
        "createdAt": "2024-01-25T18:46:59.811Z"
      },
      {
        "id": "65b2acb316d8d0003b5c6e15",
        "name": "Sandbags",
        "icon":"",
        "createdAt": "2024-01-25T18:47:15.764Z"
      },
      {
        "id": "65b2acc816d8d0003b5c6e16",
        "name": "Tables",
        "icon":MdTableRestaurant,
        "createdAt": "2024-01-25T18:47:36.521Z"
      },
      {
        "id": "65b2acd616d8d0003b5c6e17",
        "name": "Chairs",
        "icons":FaChair,
        "createdAt": "2024-01-25T18:47:50.113Z"
      },
      {
        "id": "65b2ace316d8d0003b5c6e18",
        "name": "Wardrobe Rack",
        "icon":"",
        "createdAt": "2024-01-25T18:48:03.358Z"
      },
      {
        "id": "65b2acf116d8d0003b5c6e19",
        "name": "Video Equipment",
        "icon":"",
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
        "icon":FaWifi,
        "createdAt": "2024-01-25T18:48:48.509Z"
      },
      {
        "id": "65b2ad2016d8d0003b5c6e1c",
        "name": "Steamer",
        "icon":"",
        "createdAt": "2024-01-25T18:49:04.352Z"
      },
      {
        "id": "65b2ad2e16d8d0003b5c6e1d",
        "name": "Natural Light",
        "icon":FaSun,
        "createdAt": "2024-01-25T18:49:18.076Z"
      },
      {
        "id": "65b2ad3c16d8d0003b5c6e1e",
        "name": "Restrooms",
        "icon":TbAirConditioning,
        "createdAt": "2024-01-25T18:49:32.544Z"
      },
      {
        "id":2,
        "name": "Garden view",
        icon: GiButterflyFlower,
      },
      {
        "id":3,
        "name": "Hot water",
        icon: BsFire,
      },
    
      {
        "id":4,
        "name": "Wifi",
        icon: AiOutlineWifi,
      },
      {
        "id":5,
        "name": "Coffee",
        icon: MdOutlineCoffeeMaker,
      },
      {
        "id":6,
        "name": "Security cameras",
        icon: BiCctv,
      },
      {
        "id":7,
        "name": "Bathtub",
        icon: MdOutlineBathtub,
      },
      {
        "id":8,
        "name": "Dedicated workspace",
        icon: GrWorkshop,
      },
      {
        "id":9,
        "name": "Safe",
        icon: RiSafeLine,
      },
      {
        "id":10,
        "name": "Free parking",
        icon: AiOutlineCar,
      },
      {
        "id":11,
        "name": "Fire extinguisher",
        icon: FaFireExtinguisher,
      },
    ]
    if (!amenities || !amenities.length) {
      return [];
    }
    const safeAmenities: Amenities[] = amenities.map((list) => ({
      id: list.id,
      name: list.name,
      icon: fromPropertyClient ? null : list.icon,
      createdAt: list.createdAt instanceof Date ? list.createdAt : list.createdAt as string,
    }));

    return safeAmenities;
  } catch (error: any) {
    throw new Error(error.message);
  }
}
