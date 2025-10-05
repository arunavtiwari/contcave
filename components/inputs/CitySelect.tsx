"use client";

import useIndianCities from "@/hook/useCities";
import Select from "react-select";
import Flag from "react-world-flags";

export type CitySelectValue = {
  value: string;
  label: string;
  state: string;
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
        placeholder="Anywhere"
        isClearable
        options={getAll()}
        value={value}
        onChange={(value) => onChange(value as CitySelectValue)}
        formatOptionLabel={(option: any) => (
          <div className="flex flex-row items-center gap-3 cursor-pointer">
            <Flag code={option.value} className="w-5" />
            <div>
              {option.label}
              <span className="text-neutral-500 ml-1">{option.region}</span>
            </div>
          </div>
        )}
        classNames={{
          control: () => "py-0.5 border-2",
          input: () => "text-lg cursor-pointer",
          option: () => "text-lg cursor-pointer",
        }}
        theme={(theme) => ({
          ...theme,
          borderRadius: 10,
          colors: {
            ...theme.colors,
            primary: "black",
            primary25: "#F3F4F6",
            primary50: "#E5E7EB",
          },
        })}
      />
    </div>
  );
}

export default CitySelect;
