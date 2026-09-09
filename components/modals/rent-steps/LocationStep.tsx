"use client";

import dynamic from "next/dynamic";
import React from "react";

import CitySelect, { CitySelectValue } from "@/components/inputs/CitySelect";
import AutoComplete, { AutoCompleteValue } from "@/components/ui/AutoComplete";
import Heading from "@/components/ui/Heading";
import Input from "@/components/ui/Input";

const Map = dynamic(() => import("@/components/shared/Map"), { ssr: false });

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
}) => {
  return (
    <div className="flex flex-col gap-4">
      <Heading title="Where is your space?" subtitle="Help creators find you" variant="h5" />
      <CitySelect
        label="City"
        required
        value={actualLocation as unknown as CitySelectValue | undefined}
        locationValue={locationValue}
        onChange={(v) => {
          setCustomValue("actualLocation", {
            ...actualLocation,
            ...v,
          });
          setCityError("");
        }}
      />
      {cityError && <p className="text-destructive text-sm mt-1">{cityError}</p>}
      <AutoComplete
        label="Address"
        required
        value={actualLocation?.display_name || ""}
        onChange={(sel: AutoCompleteValue) => {
          setCustomValue("actualLocation", {
            ...actualLocation,
            display_name: sel.display_name,
            latlng: sel.latlng,
          });
          setAddressError("");
        }}
      />
      {addressError && <p className="text-destructive text-sm mt-1">{addressError}</p>}
      <div className="w-full">
        <Input
          id="additionalInfo"
          label="Additional Info"
          type="text"
          disabled={isLoading}
          placeholder="Apartment, suite, unit, building, floor, etc."
          value={actualLocation?.additionalInfo || ""}
          onChange={(e) => {
            const value = e.target.value;
            setCustomValue("actualLocation", {
              ...actualLocation,
              additionalInfo: value,
            });
          }}
        />
      </div>
      <Map center={actualLocation?.latlng as [number, number] | undefined} animated />
    </div>
  );
};

export default LocationStep;
