"use client";

import React from "react";

import ListingLocationFields from "@/components/listing/ListingLocationFields";
import Heading from "@/components/ui/Heading";
import { LocationSchema } from "@/schemas/listing";

interface LocationStepProps {
  actualLocation: LocationSchema | null;
  locationValue: string;
  setCustomValue: (id: string, value: unknown) => void;
  cityError: string;
  setCityError: (error: string) => void;
  addressError: string;
  setAddressError: (error: string) => void;
  isLoading: boolean;
}

const LocationStep: React.FC<LocationStepProps> = ({
  actualLocation,
  locationValue,
  setCustomValue,
  cityError,
  setCityError,
  addressError,
  setAddressError,
  isLoading,
}) => (
  <div className="flex flex-col gap-4">
    <Heading title="Where is your space?" subtitle="Help creators find you" variant="h5" />
    <ListingLocationFields
      value={actualLocation}
      locationValue={locationValue}
      cityError={cityError}
      addressError={addressError}
      disabled={isLoading}
      onChange={(location) => {
        setCustomValue("actualLocation", location);
        setCityError("");
        setAddressError("");
      }}
    />
  </div>
);

export default LocationStep;
