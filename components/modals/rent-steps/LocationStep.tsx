"use client";

import dynamic from "next/dynamic";
import React from "react";

import CitySelect, { CitySelectValue } from "@/components/inputs/CitySelect";
import AutoComplete, { AutoCompleteValue } from "@/components/ui/AutoComplete";
import Heading from "@/components/ui/Heading";
import Input from "@/components/ui/Input";

const Map = dynamic(() => import("@/components/map/Map"), { ssr: false });

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
  const lat = actualLocation?.latlng?.[0];
  const lng = actualLocation?.latlng?.[1];

  const mapCenter = React.useMemo<[number, number] | undefined>(() => {
    if (lat === undefined || lng === undefined) return undefined;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
    return [lat, lng];
  }, [lat, lng]);

  return (
    <div className="flex flex-col gap-4">
      <Heading title="Where is your space?" subtitle="Help creators find you" variant="h5" />
      <CitySelect
        label="City"
        required
        value={actualLocation as unknown as CitySelectValue | undefined}
        locationValue={locationValue}
        error={cityError}
        onChange={(v) => {
          setCustomValue("actualLocation", {
            ...actualLocation,
            ...v,
          });
          setCityError("");
        }}
      />
      <AutoComplete
        label="Address"
        required
        value={actualLocation?.display_name || ""}
        error={addressError}
        onChange={(sel: AutoCompleteValue) => {
          setCustomValue("actualLocation", {
            ...actualLocation,
            display_name: sel.display_name,
            latlng: sel.latlng,
          });
          setAddressError("");
        }}
      />
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
      <Map center={mapCenter} animated />
    </div>
  );
};

export default LocationStep;
