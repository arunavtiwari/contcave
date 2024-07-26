"use client";

import getAmenities from "@/app/actions/getAmenities";
import { motion } from "framer-motion";
import { useState } from "react";
import { AiOutlineCar, AiOutlineWifi } from "react-icons/ai";
import { BiCctv } from "react-icons/bi";
import { BsFire } from "react-icons/bs";
import { FaChair, FaFireExtinguisher, FaLightbulb, FaSun, FaWifi } from "react-icons/fa";
import { GiButterflyFlower } from "react-icons/gi";
import { GrWorkshop } from "react-icons/gr";
import { MdOutlineBathtub, MdOutlineCoffeeMaker, MdTableRestaurant } from "react-icons/md";
import { RiSafeLine } from "react-icons/ri";
import { TbAirConditioning } from "react-icons/tb";



type Props = {
  amenities?: Array<any>;
  definedAmenities?: Array<any>;
};

const getIconByName = (name) => {
  const amenities: any[] = [
    {
      "id": "65b2ac4116d8d0003b5c6e12",
      "name": "Lighting Equipment",
      "icon": FaLightbulb,
      "createdAt": "2024-01-25T18:45:21.478Z"
    },
    {
      "id": "65b2ac9616d8d0003b5c6e13",
      "name": "Blackout blinds",
      "icon": "",
      "createdAt": "2024-01-25T18:46:46.102Z"
    },
    {
      "id": "65b2aca316d8d0003b5c6e14",
      "name": "White Backdrop",
      "icon": "",
      "createdAt": "2024-01-25T18:46:59.811Z"
    },
    {
      "id": "65b2acb316d8d0003b5c6e15",
      "name": "Sandbags",
      "icon": "",
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
      "icon": "",
      "createdAt": "2024-01-25T18:48:03.358Z"
    },
    {
      "id": "65b2acf116d8d0003b5c6e19",
      "name": "Video Equipment",
      "icon": "",
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
      "icon": FaWifi,
      "createdAt": "2024-01-25T18:48:48.509Z"
    },
    {
      "id": "65b2ad2016d8d0003b5c6e1c",
      "name": "Steamer",
      "icon": "",
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
      "icon": TbAirConditioning,
      "createdAt": "2024-01-25T18:49:32.544Z"
    },
    {
      "id": 2,
      "name": "Garden view",
      icon: GiButterflyFlower,
    },
    {
      "id": 3,
      "name": "Hot water",
      icon: BsFire,
    },
    {
      "id": 5,
      "name": "Coffee",
      icon: MdOutlineCoffeeMaker,
    },
    {
      "id": 6,
      "name": "Security cameras",
      icon: BiCctv,
    },
    {
      "id": 7,
      "name": "Bathtub",
      icon: MdOutlineBathtub,
    },
    {
      "id": 8,
      "name": "Dedicated workspace",
      icon: GrWorkshop,
    },
    {
      "id": 9,
      "name": "Safe",
      icon: RiSafeLine,
    },
    {
      "id": 10,
      "name": "Free parking",
      icon: AiOutlineCar,
    },
    {
      "id": 11,
      "name": "Fire extinguisher",
      icon: FaFireExtinguisher,
    },
  ]
  const amenity = amenities.find((amenity) => amenity.name === name);
  return amenity ? amenity.icon : null;
};

function Offers({ amenities, definedAmenities }: Props) {

  definedAmenities = definedAmenities?.filter((item) => amenities?.includes(item.id))
  definedAmenities?.forEach((item) => {
    item.icon = getIconByName(item.name)
  })
  return (
    <>


      <div>
        {/* <hr/> */}
        <p className="text-xl font-semibold">What this space offers</p>
        <div className="flex justify-start space-x-12 pt-6">
          <div className="gap-2 grid grid-cols-2">
            {definedAmenities?.map((item, index) =>
            (
              <motion.div
                initial={{
                  x: -200,
                  opacity: 0,
                }}
                transition={{ duration: 1 }}
                whileInView={{ opacity: 1, x: 0 }}
                key={index}
                className="flex justify-start items-center text-center gap-4 my-1 cursor-pointer"
              >
                {item.icon && (
                  <item.icon size={25} className="text-gray-700" />
                )}


                <p className="text-neutral-500">{item.name}</p>
              </motion.div>
            ))}
          </div>
          {/* another row */}

        </div>
      </div>
    </>
  );
}

export default Offers;
