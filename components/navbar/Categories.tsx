"use client";

import { useSearchParams } from "next/navigation";
import {
  GiCaveEntrance,
  GiPineTree, GiPhotoCamera,
  GiSunflower, GiCube, GiLighthouse, GiMountainCave,
  GiArtificialIntelligence, GiFruitBowl
} from "react-icons/gi";
import { IoDiamond } from "react-icons/io5";
import { MdOutlineVilla } from "react-icons/md";
import CategoryBox from "../CategoryBox";
import Container from "../Container";



export const categories = [
  {
    label: "Studios",
    icon: GiPhotoCamera,
    description: "For a modern touch, explore futuristic and contemporary spaces!",
  },
  {
    label: "Urban",
    icon: MdOutlineVilla,
    description: "This location is in the heart of the city!",
  },
  {
    label: "Nature",
    icon: GiPineTree,
    description: "Surrounded by natural beauty, perfect for outdoor shoots!",
  },
  {
    label: "Open Spaces",
    icon: GiSunflower,
    description: "A location with expansive open space, great for creative shots!",
  },
  {
    label: "Minimalist",
    icon: GiCube,
    description: "Simplicity at its best, perfect for minimalist aesthetics!",
  },
  {
    label: "Seaside",
    icon: GiLighthouse,
    description: "Shoot by the sea, with breathtaking views and natural lighting!",
  },
  {
    label: "Mountain",
    icon: GiMountainCave,
    description: "Find serenity in the mountains, an ideal retreat for your shoot!",
  },
  {
    label: "Artistic",
    icon: GiArtificialIntelligence,
    description: "Discover studios designed for artistic and creative photography!",
  },
  {
    label: "Vintage",
    icon: GiCaveEntrance,
    description: "Step into the past with locations exuding vintage vibes!",
  },
  {
    label: "Chic & Trendy",
    icon: IoDiamond,
    description: "Stay on-trend with chic and stylish shoot locations!",
  },
  {
    label: "Public Spaces",
    icon: GiFruitBowl,
    description: "Capture the essence of vibrant open-air markets in your shoot!",
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
