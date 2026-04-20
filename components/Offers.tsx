"use client";

import { useMemo } from "react";
import { IconType } from "react-icons";
import { FaPlus } from "react-icons/fa";

import Heading from "@/components/ui/Heading";
import { AMENITIES } from "@/constants/amenities";

interface AmenityProp {
  id: string;
  name: string;
  icon?: string | null;
  createdAt: Date;
}

type Props = {
  amenities?: string[];
  definedAmenities?: AmenityProp[];
  customAmenities?: string[];
};

const getIconByName = (name: string) => {
  const amenity = AMENITIES.find((item) => item.name === name);
  return amenity ? amenity.icon : null;
};

function Offers({ amenities, definedAmenities, customAmenities }: Props) {
  const displayAmenities = useMemo(() => {
    if (!definedAmenities || !amenities) return [];

    return definedAmenities
      .filter((item) => amenities.includes(item.id))
      .map((item) => ({
        ...item,
        icon: getIconByName(item.name) as IconType | null,
      }));
  }, [amenities, definedAmenities]);

  const displayCustomAmenities = useMemo(() => {
    if (!Array.isArray(customAmenities)) return [];

    return customAmenities
      .map((item) => item.trim())
      .filter(Boolean)
      .filter((item, index, arr) => arr.findIndex((value) => value.toLowerCase() === item.toLowerCase()) === index);
  }, [customAmenities]);

  return (
    <div className="space-y-4">
      <Heading title="What this space offers" variant="h5" />
      <div className="grid grid-cols-2 gap-x-8 gap-y-4">
        {displayAmenities.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 transition-colors group"
          >
            {item.icon && (
              <item.icon size={22} className="text-muted-foreground group-hover:text-foreground transition-colors" />
            )}
            <p className="text-foreground text-sm font-medium">{item.name}</p>
          </div>
        ))}
        {displayCustomAmenities.map((item) => (
          <div
            key={item}
            className="flex items-center gap-3 transition-colors group"
          >
            <FaPlus size={22} className="text-muted-foreground group-hover:text-foreground transition-colors" />
            <p className="text-foreground text-sm font-medium">{item}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Offers;
