"use client";

import React from "react";
import { UseFormRegister } from "react-hook-form";

import Input from "@/components/inputs/Input";
import OtherListingDetails, { ListingDetails } from "@/components/inputs/OtherListingDetails";
import Heading from "@/components/ui/Heading";
import { ListingSchema } from "@/schemas/listing";

interface OtherDetailsStepProps {
  listingDetails: ListingDetails;
  handleDetailsChange: (details: ListingDetails) => void;
  listingType?: "STANDARD" | "CURATED";
  register: UseFormRegister<ListingSchema>;
}

const OtherDetailsStep: React.FC<OtherDetailsStepProps> = ({
  listingDetails,
  handleDetailsChange,
  listingType = "STANDARD",
  register,
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
      {isCurated && (
        <div className="flex flex-col gap-3 pt-2 border-t border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Online presence (optional)</p>
          <Input
            id="mapsUrl"
            label="Google Maps URL"
            register={register("mapsUrl")}
            errors={{}}
            placeholder="https://maps.google.com/…"
          />
          <Input
            id="websiteUrl"
            label="Studio Website"
            register={register("websiteUrl")}
            errors={{}}
            placeholder="https://yourstudio.com"
          />
          <Input
            id="instagramHandle"
            label="Instagram Handle"
            register={register("instagramHandle")}
            errors={{}}
            placeholder="@yourstudio"
          />
        </div>
      )}
    </div>
  );
};

export default OtherDetailsStep;
