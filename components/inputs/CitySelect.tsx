"use client";

import Select from "react-select";
import Flag from "react-world-flags";

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
  onChange: (value: CitySelectValue) => void;
  size?: "sm" | "md";
};

function CitySelect({ value, onChange, size = "md" }: Props) {
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
          input: () => `${size === "sm" ? "text-sm" : "text-lg"} cursor-pointer`,
          option: () => `${size === "sm" ? "text-sm" : "text-lg"} cursor-pointer`,
        }}
        styles={{
          input: (base) => ({
            ...base,
            color: "var(--color-foreground)",
          }),
          control: (base, state) => ({
            ...base,
            backgroundColor: "var(--color-background)",
            borderColor: state.isFocused ? "var(--color-foreground)" : "var(--color-border)",
            borderRadius: "0.75rem",
            padding: "0 4px",
            boxShadow: state.isFocused ? "0 0 0 1px rgba(0,0,0,0.1)" : "none",
            minHeight: size === "sm" ? "36px" : "42px",
            height: size === "sm" ? "36px" : "42px",
            fontSize: size === "sm" ? "0.875rem" : "1.125rem",
            transition: "all 0.2s ease",
            "&:hover": {
              borderColor: state.isFocused ? "var(--color-foreground)" : "var(--color-border)",
            },
          }),
        }}
        theme={(theme) => ({
          ...theme,
          borderRadius: 12,
          colors: {
            ...theme.colors,
            primary: "var(--color-foreground)",
            primary25: "rgba(0,0,0,0.1)",
            primary50: "var(--color-border)",
          },
        })}
      />
    </div>
  );
}

export default CitySelect;

