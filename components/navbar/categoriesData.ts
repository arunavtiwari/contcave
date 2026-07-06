import { IconType } from "react-icons";
import { FaBuilding, FaPodcast } from "react-icons/fa";
import {
  GiMusicalNotes,
  GiPhotoCamera,
} from "react-icons/gi";
import { IoIosPartlySunny } from "react-icons/io";
import { MdCelebration, MdHomeWork, MdLocalCafe } from "react-icons/md";

// Labels must match VENUE_TYPE_LABELS from lib/taxonomy.ts exactly — they are stored in Listing.venueTypes
export interface Category {
  label: string;
  icon: IconType;
  description: string;
}

export const categories: Category[] = [
  {
    label: "Shoot Studio",
    icon: GiPhotoCamera,
    description: "Controlled environment with backdrops and lighting setups.",
  },
  {
    label: "Home-Style Set",
    icon: MdHomeWork,
    description: "Designed like a cozy living space or apartment.",
  },
  {
    label: "Café / Restaurant",
    icon: MdLocalCafe,
    description: "Stylish eateries perfect for cozy, lifestyle photos.",
  },
  {
    label: "Event Space",
    icon: MdCelebration,
    description: "Versatile venues ideal for shoots with more space.",
  },
  {
    label: "Co-working",
    icon: FaBuilding,
    description: "Modern collaborative spaces repurposed for shoots.",
  },
  {
    label: "Recording Studio",
    icon: GiMusicalNotes,
    description: "Soundproofed and acoustically treated spaces for music and audio.",
  },
  {
    label: "Podcast Studio",
    icon: FaPodcast,
    description: "Set up for audio/video podcast and interview productions.",
  },
  {
    label: "Outdoor / Rooftop",
    icon: IoIosPartlySunny,
    description: "Natural lighting and outdoor scenery for dynamic shoots.",
  },
];
