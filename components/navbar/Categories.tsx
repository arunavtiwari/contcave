"use client";
import { useSearchParams, useRouter } from "next/navigation";
import {
  GiMusicalNotes,
  GiCycle, GiPhotoCamera,
} from "react-icons/gi";
import { IoIosPartlySunny } from "react-icons/io";
import { FaPodcast, FaBuilding } from "react-icons/fa";
import { MdOutlineRoofing, MdHomeWork, MdLocalCafe, MdCelebration } from "react-icons/md";
import CategoryBox from "../CategoryBox";
import { Dialog } from "@headlessui/react"; 
import { useState } from "react";


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

  {
    label: "Cyclorama Studio",
    icon: GiCycle,
    description: "Infinity walls for seamless product and fashion shoots.",
  },
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
  const params = useSearchParams()!; 
  const category = params.get("category");
  const type = params.get("type");
  const router = useRouter();
  const currentType = params?.get("type");

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(currentType || null);

  const handleApplyFilters = () => {
    const url = new URLSearchParams(Array.from(params.entries()));

    if (selectedType) {
      url.set("type", selectedType);
    } else {
      url.delete("type");
    }

    router.push(`?${url.toString()}`);
    setIsFilterOpen(false);
  };


  return (
    <div className="pt-2 w-full flex flex-row items-center justify-between gap-2">
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
      <div className="flex-shrink-0">
        <button
          onClick={() => setIsFilterOpen(true)}
          className="px-4 py-2 bg-gray-100 rounded-lg text-sm whitespace-nowrap"
        >
          More Filters
        </button>

        <Dialog open={isFilterOpen} onClose={() => setIsFilterOpen(false)} className="relative z-50">
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
          <div className="fixed inset-0 flex items-center justify-center">
            <Dialog.Panel className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
              <Dialog.Title className="text-lg font-semibold mb-4">More Filters</Dialog.Title>

              <div className="space-y-4">
                <label className="block text-sm font-medium">Type</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    "Fashion shoot", "Product shoot", "Podcast", "Recording Studio",
                    "Film Shoot", "Outdoor Event", "Content shoot", "Pre-Wedding",
                    "Meetings", "Workshops", "Photo Shoot"
                  ].map((spaceType) => (
                    <button
                      key={spaceType}
                      type="button"
                      onClick={() =>
                        setSelectedType((prev) => (prev === spaceType ? null : spaceType))
                      }
                      className={`px-3 py-1 rounded-full border text-sm ${
                        selectedType === spaceType
                          ? "bg-black text-white border-black"
                          : "border-gray-300 hover:bg-gray-100"
                      }`}
                    >
                      {spaceType}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  onClick={() => setIsFilterOpen(false)}
                  className="px-4 py-2 text-sm rounded bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplyFilters}
                  className="px-4 py-2 text-sm rounded bg-black text-white"
                >
                  Apply
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      </div>
    </div>
  );
}

export default Categories;