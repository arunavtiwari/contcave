"use client";

import React from "react";

import OtherListingDetails, { ListingDetails } from "@/components/inputs/OtherListingDetails";
import Heading from "@/components/ui/Heading";

interface OtherDetailsStepProps {
  listingDetails: ListingDetails;
  handleDetailsChange: (details: ListingDetails) => void;
}

const OtherDetailsStep: React.FC<OtherDetailsStepProps> = ({
  listingDetails,
  handleDetailsChange,
}) => {
  return (
    <div className="flex flex-col gap-8">
      <Heading title="A few more details" subtitle="Help creators understand your space better" variant="h5" />
      <OtherListingDetails
        data={listingDetails}
        onChange={handleDetailsChange}
      />
    </div>
  );
};

export default OtherDetailsStep;
