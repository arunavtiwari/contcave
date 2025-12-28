"use client";
import { useSearchParams } from "next/navigation";
import {
  GiMusicalNotes,
  GiCycle, GiPhotoCamera,
} from "react-icons/gi";
import { IoIosPartlySunny } from "react-icons/io";
import { FaPodcast, FaBuilding } from "react-icons/fa";
import { MdHomeWork, MdLocalCafe, MdCelebration } from "react-icons/md";
import CategoryBox from "@/components/CategoryBox";
import FilterModal from "@/components/modals/FilterModal";


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

  {
    label: "Café / Restaurant",
    icon: MdLocalCafe,
    description: "Stylish eateries perfect for cozy, lifestyle photos.",
  },

  {
    label: "Cyclorama Studio",
    icon: GiCycle,
    description: "Infinity walls for seamless product and fashion shoots.",
  },

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
  const params = useSearchParams()!;
  const category = params.get("category");


  return (
    <div className="mt-4 mb-6 w-full flex flex-row items-center justify-between gap-2 border-b border-gray-200">
      {/* Category List */}
      <div className="flex-1 overflow-x-auto hide-scrollbar flex gap-4 items-center">
        {categories.map((item, index) => (
          <CategoryBox
            key={index}
            icon={item.icon}
            label={item.label}
            selected={category === item.label}
          />
        ))}
      </div>

      {/* More Filters Button + Dialog */}
      <FilterModal />
    </div>
  );
}

export default Categories;
