"use client";

import { useSearchParams } from "next/navigation";
import {
  GiMusicalNotes,
  GiPineTree, GiPhotoCamera,
} from "react-icons/gi";
import { IoIosPartlySunny } from "react-icons/io";
import { FaPodcast, FaBuilding } from "react-icons/fa";
import { MdOutlineRoofing, MdHomeWork, MdLocalCafe, MdCelebration } from "react-icons/md";
import CategoryBox from "../CategoryBox";
import Container from "../Container";



export const categories = [
  {
    label: "Indoor Studio",
    icon: GiPhotoCamera,
    description: "Controlled environment with backdrops and lighting setups.",
  },
  {
    label: "Outdoor Studio",
    icon: IoIosPartlySunny,
    description: "Natural lighting and outdoor scenery for dynamic shoots.",
  },
  {
    label: "Podcast Studio",
    icon: FaPodcast,
    description: "Set up for audio/video podcast productions.",
  },

  // {
  //   label: "Rooftop / Terrace",
  //   icon: MdOutlineRoofing,
  //   description: "Urban rooftops with stunning skyline views.",
  // },
  {
    label: "Café / Restaurant",
    icon: MdLocalCafe,
    description: "Stylish eateries perfect for cozy, lifestyle photos.",
  },

  // {
  //   label: "Cyclorama Studio",
  //   icon: GiCycle,
  //   description: "Infinity walls for seamless product and fashion shoots.",
  // },
  // {
  //   label: "Themed Studio",
  //   icon: GiPerspectiveDiceSixFacesRandom,
  //   description: "Stylized, pre-set environments for creative projects.",
  // },
  // {
  //   label: "Green Screen Studio",
  //   icon: GiGreenPower,
  //   description: "Perfect for VFX, digital compositing, and YouTube content.",
  // },
  {
    label: "Recording Studio",
    icon: GiMusicalNotes,
    description: "Soundproof and acoustically treated spaces for music shoots.",
  },
  {
    label: "Home-Style Setup",
    icon: MdHomeWork,
    description: "Designed like a cozy living space or apartment.",
  },
  {
    label: "Event Space",
    icon: MdCelebration,
    description: "Versatile venues ideal for shoots with more space.",
  },
  {
    label: "Co-working Space",
    icon: FaBuilding,
    description: "Modern collaborative spaces repurposed for shoots.",
  },
];


type Props = {};

function Categories({ }: Props) {
  const params = useSearchParams();
  const category = params?.get("category");

  return (
    <div className="fixed w-full bg-white z-20 left-0 top-[80px]">
      <Container>
        <div className="pt-2 w-full flex flex-row items-center justify-between overflow-x-auto hide-scrollbar gap-5">
          {categories.map((item, index) => (
            <CategoryBox
              key={index}
              icon={item.icon}
              label={item.label}
              selected={category === item.label}
            />
          ))}
        </div>
      </Container>
    </div>
  );
}

export default Categories;