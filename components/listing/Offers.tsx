"use client";

import { useMemo } from "react";
import type { IconType } from "react-icons";
import { FiCheckCircle } from "react-icons/fi";

import Heading from "@/components/ui/Heading";
import { AMENITIES } from "@/constants/amenities";

interface AmenityProp {
  id: string;
  name: string;
  icon?: string | null;
  createdAt: string;
}

type Props = {
  amenities?: string[];
  definedAmenities?: AmenityProp[];
  customAmenities?: string[];
};

const normalize = (name: string) => name.trim().toLowerCase();

const iconFor = (name: string): IconType =>
  AMENITIES.find((item) => normalize(item.name) === normalize(name))?.icon ?? FiCheckCircle;

function Offers({ amenities, definedAmenities, customAmenities }: Props) {
  const items = useMemo(() => {
    const defined = (definedAmenities ?? [])
      .filter((item) => amenities?.includes(item.id))
      .map((item) => item.name.trim());
    const custom = (customAmenities ?? []).map((item) => item.trim()).filter(Boolean);
    return [...defined, ...custom].filter(
      (name, index, all) => all.findIndex((other) => normalize(other) === normalize(name)) === index
    );
  }, [amenities, definedAmenities, customAmenities]);

  return (
    <div className="space-y-4">
      <Heading as="h2" title="What this space offers" variant="h5" />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-3.5">
        {items.map((name) => {
          const Icon = iconFor(name);
          return (
            <div key={name} className="flex items-center gap-3 transition-colors group">
              <Icon size={20} className="text-muted-foreground group-hover:text-foreground shrink-0 transition-colors" />
              <p className="text-foreground text-sm font-medium truncate">{name}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Offers;
