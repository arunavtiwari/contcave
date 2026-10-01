"use client";

import dynamic from "next/dynamic";
import React from "react";

import CitySelect, { CitySelectValue } from "@/components/inputs/CitySelect";
import AutoComplete, { AutoCompleteValue } from "@/components/ui/AutoComplete";
import Input from "@/components/ui/Input";
import { isLatLng } from "@/lib/geo";
import type { LocationSchema } from "@/schemas/listing";

const Map = dynamic(() => import("@/components/map/Map"), { ssr: false });

type Props = {
  value: LocationSchema | null;
  locationValue?: string;
  onChange: (location: LocationSchema) => void;
  cityError?: string;
  addressError?: string;
  disabled?: boolean;
  variant?: "vertical" | "horizontal";
  showMap?: boolean;
};

export default function ListingLocationFields({
  value,
  locationValue,
  onChange,
  cityError,
  addressError,
  disabled,
  variant = "vertical",
  showMap = true,
}: Props) {
  const latlng = value?.latlng;
  const mapCenter = React.useMemo(() => (isLatLng(latlng) ? latlng : undefined), [latlng]);

  return (
    <div className="flex flex-col gap-4">
      <CitySelect
        label="City"
        required
        variant={variant}
        value={value as unknown as CitySelectValue | undefined}
        locationValue={locationValue}
        error={cityError}
        onChange={(city) => onChange({ ...value, ...city } as LocationSchema)}
      />
      <AutoComplete
        label="Address"
        required
        variant={variant}
        value={value?.display_name || ""}
        error={addressError}
        onChange={(place: AutoCompleteValue) =>
          onChange({ ...value, display_name: place.display_name, latlng: place.latlng } as LocationSchema)
        }
      />
      <Input
        id="additionalInfo"
        label="Additional Info"
        type="text"
        variant={variant}
        disabled={disabled}
        placeholder="Apartment, suite, unit, building, floor, etc."
        value={value?.additionalInfo || ""}
        onChange={(event) => onChange({ ...value, additionalInfo: event.target.value } as LocationSchema)}
      />
      {showMap && <Map center={mapCenter} animated />}
    </div>
  );
}
