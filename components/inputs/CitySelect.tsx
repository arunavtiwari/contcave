"use client";

import Select from "react-select";
import Flag from "react-world-flags";

import useIndianCities from "@/hook/useCities";

export type CitySelectValue = {
  value: string;
  label: string;
  state: string;
  region?: string;
  latlng: number[];

};

type Props = {
  value?: CitySelectValue;
  onChange: (value: CitySelectValue) => void;
};

function CitySelect({ value, onChange }: Props) {
  const { getAll } = useIndianCities();

  return (
    <div>
      <Select
        inputId="city-select"
        placeholder="Anywhere"
        isClearable
        options={getAll()}
        value={value}
        onChange={(value) => onChange(value as CitySelectValue)}
        formatOptionLabel={(option: CitySelectValue) => (
          <div className="flex flex-row items-center gap-3 cursor-pointer">
            <Flag code={option.value} className="w-5" />
            <div>
              {option.label}
              <span className="text-neutral-500 ml-1">{option.region}</span>
            </div>
          </div>
        )}
        classNames={{
          control: () => "py-0.5 border",
          input: () => "text-lg cursor-pointer",
          option: () => "text-lg cursor-pointer",
        }}
        styles={{
          input: (base) => ({
            ...base,
            color: 'transparent',
          }),
          control: (base, state) => ({
            ...base,
            borderColor: state.isFocused ? 'foreground' : base.borderColor,
          }),
        }}
        theme={(theme) => ({
          ...theme,
          borderRadius: 10,
          colors: {
            ...theme.colors,
            primary: "foreground",
            primary25: "#F3F4F6",
            primary50: "#E5E7EB",
          },
        })}
      />
    </div>
  );
}

export default CitySelect;
