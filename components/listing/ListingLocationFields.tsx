"use client";

import dynamic from "next/dynamic";
import React from "react";

import CitySelect from "@/components/inputs/CitySelect";
import AutoComplete, { AutoCompleteValue } from "@/components/ui/AutoComplete";
import Input from "@/components/ui/Input";
import { INDIAN_CITIES } from "@/hooks/useCities";
import { isLatLng } from "@/lib/geo";
import { applyAddressChoice, applyCityChoice, type LocationDraft } from "@/lib/listing/location";

const Map = dynamic(() => import("@/components/map/Map"), { ssr: false });

type Props = {
  value: LocationDraft | null;
  locationValue?: string;
  onChange: (location: LocationDraft) => void;
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
  const mapCenter = React.useMemo(() => {
    if (isLatLng(latlng)) return latlng;
    const city = INDIAN_CITIES.find((item) => item.value === value?.value);
    return isLatLng(city?.latlng) ? city.latlng : undefined;
  }, [latlng, value?.value]);

  return (
    <div className="flex flex-col gap-4">
      <CitySelect
        label="City"
        required
        variant={variant}
        value={value}
        locationValue={locationValue}
        error={cityError}
        onChange={(city) => onChange(applyCityChoice(value, city))}
      />
      <AutoComplete
        label="Address"
        required
        variant={variant}
        value={value?.display_name || ""}
        error={addressError}
        onChange={(place: AutoCompleteValue) =>
          onChange(applyAddressChoice(value, place))
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
        onChange={(event) => onChange({ ...value, additionalInfo: event.target.value })}
      />
      {showMap && <Map center={mapCenter} animated />}
    </div>
  );
}
