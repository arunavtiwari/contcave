"use client";

import { Amenities } from "@prisma/client";
import React from "react";

import AmenitiesCheckbox from "@/components/inputs/AmenitySelection";
import Heading from "@/components/ui/Heading";

interface AmenitiesStepProps {
  amenities: string[];
  amenitiesData: Amenities[];
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
    <div className="flex flex-col gap-8">
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
