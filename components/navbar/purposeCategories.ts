import type { IconType } from "react-icons";
import { FaPodcast } from "react-icons/fa";
import { GiMusicalNotes, GiPhotoCamera } from "react-icons/gi";
import { MdCelebration, MdWallpaper } from "react-icons/md";

import { SHOOT_PURPOSES, type ShootPurpose } from "@/lib/listing/shootPurposes";

const ICONS: Record<string, IconType> = {
    backdrop: MdWallpaper,
    styled: GiPhotoCamera,
    podcast: FaPodcast,
    recording: GiMusicalNotes,
    event: MdCelebration,
};

/** Top filter bar on /studios and city pages: what the shoot is, not what the venue is. */
export const purposeCategories: Array<ShootPurpose & { icon: IconType }> = SHOOT_PURPOSES.filter((purpose) => !purpose.hidden).map((purpose) => ({
    ...purpose,
    icon: ICONS[purpose.slug] ?? GiPhotoCamera,
}));
