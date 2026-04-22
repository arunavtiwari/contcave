"use client";

import Flag from "react-world-flags";

import Select from "@/components/ui/Select";
import useIndianCities from "@/hooks/useCities";

export type CitySelectValue = {
  value: string;
  label: string;
  state: string;
  region?: string;
  latlng: number[];
};

type Props = {
  value?: CitySelectValue;
  locationValue?: string;
  onChange: (value: CitySelectValue) => void;
  size?: "sm" | "md";
};

function CitySelect({ value, locationValue, onChange, size = "md" }: Props) {
  const { getAll } = useIndianCities();

  const options = getAll();
  const selectedValue = options.find((opt) =>
    opt.value.toLowerCase() === value?.value?.toLowerCase() ||
    (locationValue && opt.value.toLowerCase() === locationValue.toLowerCase())
  ) || null;

  return (
    <Select
      inputId="city-select"
      placeholder="Anywhere"
      isClearable={false}
      options={options}
      value={selectedValue}
      onChange={(value) => onChange(value as CitySelectValue)}
      size={size}
      formatOptionLabel={(data) => {
        const option = data as unknown as CitySelectValue;
        return (
          <div className="flex flex-row items-center gap-3 cursor-pointer">
            <Flag code={option.value} className="w-5" />
            <div>
              {option.label}
              <span className="text-muted-foreground ml-1">{option.region}</span>
            </div>
          </div>
        );
      }}
    />
  );
}

export default CitySelect;
