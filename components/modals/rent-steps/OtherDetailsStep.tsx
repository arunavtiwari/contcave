"use client";

import OtherListingDetails, { ListingDetails } from "@/components/inputs/OtherListingDetails";
import Heading from "@/components/ui/Heading";

interface OtherDetailsStepProps {
  listingDetails: ListingDetails;
  handleDetailsChange: (details: ListingDetails) => void;
  listingType?: "STANDARD" | "CURATED";
}

const OtherDetailsStep: React.FC<OtherDetailsStepProps> = ({
  listingDetails,
  handleDetailsChange,
  listingType = "STANDARD",
}) => {
  const isCurated = listingType === "CURATED";

  return (
    <div className="flex flex-col gap-4">
      <Heading
        title="Additional details"
        subtitle={isCurated ? "Add whatever info you have — everything here is optional." : "Help creators understand your space better."}
        variant="h5"
      />
      <OtherListingDetails
        data={listingDetails}
        onChange={handleDetailsChange}
        optional={isCurated}
      />
    </div>
  );
};

export default OtherDetailsStep;
