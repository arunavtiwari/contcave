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
        isClearable={false}
        options={getAll()}
        value={value}
        onChange={(value) => onChange(value as CitySelectValue)}
        formatOptionLabel={(option: CitySelectValue) => (
          <div className="flex flex-row items-center gap-3 cursor-pointer">
            <Flag code={option.value} className="w-5" />
            <div>
              {option.label}
              <span className="text-muted-foreground ml-1">{option.region}</span>
            </div>
          </div>
        )}
        classNames={{
          input: () => "text-lg cursor-pointer",
          option: () => "text-lg cursor-pointer",
        }}
        styles={{
          input: (base) => ({
            ...base,
            color: "var(--color-foreground)",
          }),
          control: (base, state) => ({
            ...base,
            backgroundColor: "var(--color-background)",
            borderColor: state.isFocused ? "var(--color-primary)" : "var(--color-border)",
            borderRadius: "0.75rem",
            padding: "0 4px",
            boxShadow: state.isFocused ? "0 0 0 1px var(--color-primary-10)" : "none",
            minHeight: "42px",
            height: "42px",
            fontSize: "1.125rem", // text-lg
            transition: "all 0.2s ease",
            "&:hover": {
              borderColor: state.isFocused ? "var(--color-primary)" : "var(--color-border)",
            },
          }),
        }}
        theme={(theme) => ({
          ...theme,
          borderRadius: 12,
          colors: {
            ...theme.colors,
            primary: "var(--color-primary)",
            primary25: "var(--color-primary-10)",
            primary50: "var(--color-border)",
          },
        })}
      />
    </div>
  );
}

export default CitySelect;
