import { IconType } from "react-icons";
import { FaBuilding, FaPodcast } from "react-icons/fa";
import {
  GiCycle,
  GiMusicalNotes,
  GiPhotoCamera,
} from "react-icons/gi";
import { IoIosPartlySunny } from "react-icons/io";
import { MdCelebration, MdHomeWork, MdLocalCafe } from "react-icons/md";

export interface Category {
  label: string;
  icon: IconType;
  description: string;
}

export const categories: Category[] = [
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
    label: "Cafe / Restaurant",
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
