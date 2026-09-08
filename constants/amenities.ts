import { IconType } from "react-icons";
import { AiOutlineCar } from "react-icons/ai";
import { BiCctv } from "react-icons/bi";
import { BsFillCameraVideoFill,BsFire } from "react-icons/bs";
import { FaChair, FaFireExtinguisher, FaLightbulb, FaPlus, FaSun, FaWifi } from "react-icons/fa";
import { GiButterflyFlower, GiSteam } from "react-icons/gi";
import { GrWorkshop } from "react-icons/gr";
import {
    MdCheckroom,
    MdElevator,
    MdOutlineBathtub,
    MdOutlineBlindsClosed,
    MdOutlineCoffeeMaker,
    MdTableRestaurant,
    MdTableRows,
    MdWallpaper,
    MdWc,
} from "react-icons/md";
import { PiProjectorScreenFill } from "react-icons/pi";
import { RiSafeLine } from "react-icons/ri";
import { TbAirConditioning } from "react-icons/tb";

export interface Amenity {
    id: string | number;
    name: string;
    icon: IconType;
    createdAt?: string;
}

// Name -> icon lookup for the "What this space offers" section (components/Offers.tsx).
// Matching is case-insensitive/trimmed, but keep `name` here identical to the amenity's
// `name` in the database (see app/actions/getAmenities.ts) whenever possible so a rename
// there doesn't silently drop an icon again.
export const AMENITIES: Amenity[] = [
    {
        "id": "65b2ac4116d8d0003b5c6e12",
        "name": "Lighting Equipment",
        "icon": FaLightbulb,
        "createdAt": "2024-01-25T18:45:21.478Z"
    },
    {
        "id": "65b2ac9616d8d0003b5c6e13",
        "name": "Blackout blinds",
        "icon": MdOutlineBlindsClosed,
        "createdAt": "2024-01-25T18:46:46.102Z"
    },
    {
        "id": "65b2aca316d8d0003b5c6e14",
        "name": "White Backdrop",
        "icon": MdWallpaper,
        "createdAt": "2024-01-25T18:46:59.811Z"
    },
    {
        "id": "65b2acb316d8d0003b5c6e15",
        "name": "Sandbags",
        "icon": FaPlus,
        "createdAt": "2024-01-25T18:47:15.764Z"
    },
    {
        "id": "65b2acc816d8d0003b5c6e16",
        "name": "Tables",
        "icon": MdTableRestaurant,
        "createdAt": "2024-01-25T18:47:36.521Z"
    },
    {
        "id": "65b2acd616d8d0003b5c6e17",
        "name": "Chairs",
        "icon": FaChair,
        "createdAt": "2024-01-25T18:47:50.113Z"
    },
    {
        "id": "65b2ace316d8d0003b5c6e18",
        "name": "Wardrobe Rack",
        "icon": MdTableRows,
        "createdAt": "2024-01-25T18:48:03.358Z"
    },
    {
        "id": "65b2acf116d8d0003b5c6e19",
        "name": "Video Equipment",
        "icon": BsFillCameraVideoFill,
        "createdAt": "2024-01-25T18:48:17.044Z"
    },
    {
        "id": "65b2acff16d8d0003b5c6e1a",
        "name": "Green Screen",
        "icon": PiProjectorScreenFill,
        "createdAt": "2024-01-25T18:48:31.774Z"
    },
    {
        "id": "65b2ad1016d8d0003b5c6e1b",
        "name": "WiFi",
        "icon": FaWifi,
        "createdAt": "2024-01-25T18:48:48.509Z"
    },
    {
        "id": "65b2ad2016d8d0003b5c6e1c",
        "name": "Steamer",
        "icon": GiSteam,
        "createdAt": "2024-01-25T18:49:04.352Z"
    },
    {
        "id": "65b2ad2e16d8d0003b5c6e1d",
        "name": "Natural Light",
        "icon": FaSun,
        "createdAt": "2024-01-25T18:49:18.076Z"
    },
    {
        "id": "65b2ad3c16d8d0003b5c6e1e",
        "name": "Restrooms",
        "icon": MdWc,
        "createdAt": "2024-01-25T18:49:32.544Z"
    },
    {
        "id": 2,
        "name": "Garden view",
        "icon": GiButterflyFlower,
    },
    {
        "id": 3,
        "name": "Hot water",
        "icon": BsFire,
    },
    {
        "id": 5,
        "name": "Coffee",
        "icon": MdOutlineCoffeeMaker,
    },
    {
        "id": 6,
        "name": "Security cameras",
        "icon": BiCctv,
    },
    {
        "id": 7,
        "name": "Bathtub",
        "icon": MdOutlineBathtub,
    },
    {
        "id": 8,
        "name": "Dedicated workspace",
        "icon": GrWorkshop,
    },
    {
        "id": 9,
        "name": "Safe",
        "icon": RiSafeLine,
    },
    {
        "id": 10,
        "name": "Free parking",
        "icon": AiOutlineCar,
    },
    {
        "id": 11,
        "name": "Fire extinguisher",
        "icon": FaFireExtinguisher,
    },
    // Entries below match the current amenity names seeded/used in
    // app/actions/getAmenities.ts (FALLBACK_AMENITIES) and production data that
    // had no counterpart above, which is why their icons were missing.
    {
        "id": 12,
        "name": "Air Conditioner",
        "icon": TbAirConditioning,
    },
    {
        "id": 13,
        "name": "Changing Room",
        "icon": MdCheckroom,
    },
    {
        "id": 14,
        "name": "Coffee Machine",
        "icon": MdOutlineCoffeeMaker,
    },
    {
        "id": 15,
        "name": "Lift",
        "icon": MdElevator,
    },
    {
        "id": 16,
        "name": "Nearby Parking",
        "icon": AiOutlineCar,
    },
    {
        "id": 17,
        "name": "Restroom",
        "icon": MdWc,
    },
    {
        "id": 18,
        "name": "Security Cameras",
        "icon": BiCctv,
    },
    {
        "id": 19,
        "name": "Table",
        "icon": MdTableRestaurant,
    },
    {
        "id": 20,
        "name": "Well Lit Space",
        "icon": FaLightbulb,
    },
    {
        "id": 21,
        "name": "Wifi",
        "icon": FaWifi,
    },
];
