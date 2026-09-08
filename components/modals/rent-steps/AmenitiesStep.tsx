"use client";

import React from "react";

import AmenitiesCheckbox from "@/components/inputs/AmenitySelection";
import Heading from "@/components/ui/Heading";
import type { SafeAmenity } from "@/types/amenity";

interface AmenitiesStepProps {
  amenities: string[];
  amenitiesData: SafeAmenity[];
  otherAmenities: string[];
  handleAmenitiesChange: (v: { predefined: { [key: string]: boolean }; custom: string[] }) => void;
}

const AmenitiesStep: React.FC<AmenitiesStepProps> = ({
  amenities,
  amenitiesData,
  otherAmenities,
  handleAmenitiesChange,
}) => {
  return (
    <div className="flex flex-col gap-4">
      <Heading title="What does your space offer?" subtitle="Select all that apply" variant="h5" />
      <AmenitiesCheckbox
        amenities={amenitiesData}
        checked={amenities}
        customAmenities={otherAmenities}
        onChange={handleAmenitiesChange}
      />
    </div>
  );
};

export default AmenitiesStep;
