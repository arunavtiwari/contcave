"use client";

import * as React from "react";
import { FiCheck, FiChevronDown, FiX } from "react-icons/fi";
import ReactSelect, {
  type ClearIndicatorProps,
  components,
  type DropdownIndicatorProps,
  type GroupBase,
  type MultiValueRemoveProps,
  type OptionProps,
  type Props as ReactSelectProps,
  type StylesConfig,
} from "react-select";
import AsyncSelect from "react-select/async";

import FormField from "@/components/ui/FormField";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  [key: string]: unknown;
}

export interface CustomSelectProps<
  Option = SelectOption,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>
> extends ReactSelectProps<Option, IsMulti, Group> {
  variant?: "vertical" | "horizontal";
  size?: "xs" | "sm" | "md" | "lg";
  error?: string;
  className?: string;
  isAsync?: boolean;
  loadOptions?: (
    inputValue: string,
    callback: (options: Option[]) => void
  ) => Promise<Option[]> | void;
  cacheOptions?: boolean;
  defaultOptions?: boolean | Option[];
}

const CustomDropdownIndicator = <
  Option,
  IsMulti extends boolean,
  Group extends GroupBase<Option>
>(
  props: DropdownIndicatorProps<Option, IsMulti, Group>
) => {
  const isXs = (props.selectProps as CustomSelectProps<Option, IsMulti, Group>).size === "xs";
  return (
    <components.DropdownIndicator {...props}>
      <FiChevronDown
        size={isXs ? 12 : 15}
        className={cn(
          "text-muted-foreground transition-transform duration-200",
          props.selectProps.menuIsOpen && "rotate-180 text-foreground"
        )}
      />
    </components.DropdownIndicator>
  );
};

const CustomClearIndicator = <
  Option,
  IsMulti extends boolean,
  Group extends GroupBase<Option>
>(
  props: ClearIndicatorProps<Option, IsMulti, Group>
) => {
  const isXs = (props.selectProps as CustomSelectProps<Option, IsMulti, Group>).size === "xs";
  return (
    <components.ClearIndicator {...props}>
      <FiX
        size={isXs ? 12 : 14}
        className="text-muted-foreground hover:text-foreground transition-colors"
      />
    </components.ClearIndicator>
  );
};

const CustomMultiValueRemove = <
  Option,
  IsMulti extends boolean,
  Group extends GroupBase<Option>
>(
  props: MultiValueRemoveProps<Option, IsMulti, Group>
) => {
  return (
    <components.MultiValueRemove {...props}>
      <FiX size={12} className="text-muted-foreground hover:text-foreground" />
    </components.MultiValueRemove>
  );
};

const CustomOption = <
  Option,
  IsMulti extends boolean,
  Group extends GroupBase<Option>
>(
  props: OptionProps<Option, IsMulti, Group>
) => {
  const isXs = (props.selectProps as CustomSelectProps<Option, IsMulti, Group>).size === "xs";
  return (
    <components.Option {...props}>
      <div className={cn("flex items-center justify-between w-full gap-2", isXs ? "text-xs" : "text-sm")}>
        <span className="truncate">{props.label}</span>
        {props.isSelected && (
          <FiCheck
            size={isXs ? 12 : 14}
            className="text-foreground shrink-0"
          />
        )}
      </div>
    </components.Option>
  );
};

const getSelectDimensions = (size: "xs" | "sm" | "md" | "lg") => {
  switch (size) {
    case "xs":
      return { height: "32px", radius: "0.5rem", fontSize: "0.75rem", padding: "0 8px" };
    case "md":
      return { height: "44px", radius: "0.75rem", fontSize: "0.875rem", padding: "0 14px" };
    case "lg":
      return { height: "48px", radius: "0.75rem", fontSize: "1rem", padding: "0 16px" };
    case "sm":
    default:
      return { height: "40px", radius: "0.75rem", fontSize: "0.875rem", padding: "0 14px" };
  }
};

export function getSelectStyles<
  Option = SelectOption,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>
>(
  size: "xs" | "sm" | "md" | "lg" = "sm",
  error?: string
): StylesConfig<Option, IsMulti, Group> {
  const dims = getSelectDimensions(size);

  return {
    control: (provided, state) => ({
      ...provided,
      backgroundColor: "var(--color-background)",
      borderWidth: "1px",
      borderColor: error
        ? "var(--color-destructive)"
        : state.isFocused
        ? "var(--color-foreground)"
        : "var(--color-border)",
      borderRadius: dims.radius,
      padding: "0",
      boxShadow: state.isFocused
        ? error
          ? "0 0 0 1px var(--color-destructive)"
          : "0 0 0 1px var(--color-foreground)"
        : "none",
      minHeight: dims.height,
      height: dims.height,
      fontSize: dims.fontSize,
      cursor: "pointer",
      transition: "border-color 0.15s ease, box-shadow 0.15s ease",
      "&:hover": {
        borderColor: error
          ? "var(--color-destructive)"
          : state.isFocused
          ? "var(--color-foreground)"
          : "rgba(0, 0, 0, 0.35)",
      },
    }),
    input: (provided) => ({
      ...provided,
      fontSize: dims.fontSize,
      margin: 0,
      padding: 0,
      color: "var(--color-foreground)",
      fontWeight: 400,
    }),
    valueContainer: (provided) => ({
      ...provided,
      padding: dims.padding,
      gap: size === "xs" ? "2px" : "4px",
    }),
    singleValue: (provided) => ({
      ...provided,
      margin: 0,
      fontSize: dims.fontSize,
      fontWeight: 400,
      color: "var(--color-foreground)",
    }),
    placeholder: (provided) => ({
      ...provided,
      margin: 0,
      fontSize: dims.fontSize,
      fontWeight: 400,
      color: "var(--color-muted-foreground)",
    }),
    option: (provided, state) => ({
      ...provided,
      cursor: "pointer",
      fontSize: dims.fontSize,
      padding: size === "xs" ? "4px 8px" : "7px 10px",
      borderRadius: "0.375rem",
      backgroundColor: state.isSelected
        ? "var(--color-muted)"
        : state.isFocused
        ? "var(--color-muted)"
        : "transparent",
      color: "var(--color-foreground)",
      transition: "background-color 0.12s ease",
      ":active": {
        backgroundColor: "var(--color-muted)",
      },
    }),
  menu: (provided) => ({
    ...provided,
    borderRadius: size === "xs" ? "0.5rem" : "0.75rem",
    overflow: "hidden",
    marginTop: "4px",
    boxShadow: "none",
    border: "1px solid var(--color-border)",
    backgroundColor: "var(--color-background)",
    padding: "3px",
    zIndex: 9999,
  }),
  menuList: (provided) => ({
    ...provided,
    padding: "1px",
    display: "flex",
    flexDirection: "column",
    gap: "1px",
  }),
  menuPortal: (base) => ({ ...base, zIndex: 99999 }),
  indicatorSeparator: () => ({ display: "none" }),
  dropdownIndicator: (provided) => ({
    ...provided,
    padding: size === "xs" ? "0 4px" : "0 8px",
    cursor: "pointer",
  }),
  clearIndicator: (provided) => ({
    ...provided,
    padding: "0 4px",
    cursor: "pointer",
  }),
  indicatorsContainer: (provided) => ({
    ...provided,
    paddingRight: "6px",
  }),
  multiValue: (provided) => ({
    ...provided,
    backgroundColor: "var(--color-muted)",
    borderRadius: "0.375rem",
    border: "1px solid var(--color-border)",
    padding: "1px 4px",
  }),
  multiValueLabel: (provided) => ({
    ...provided,
    color: "var(--color-foreground)",
    fontSize: "0.75rem",
    fontWeight: 500,
  }),
  };
};

function Select<
  Option = SelectOption,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>
>({
  variant = "vertical",
  size = "sm",
  label,
  description,
  required,
  error,
  className,
  isSearchable = false,
  isAsync = false,
  loadOptions,
  cacheOptions,
  defaultOptions,
  maxMenuHeight = 280,
  components: userComponents,
  ...props
}: CustomSelectProps<Option, IsMulti, Group> & {
  label?: string;
  description?: string;
  required?: boolean;
}) {
  const reactSelectId = React.useId();
  const customStyles = getSelectStyles<Option, IsMulti, Group>(size, error);

  const mergedComponents = React.useMemo(
    () => ({
      DropdownIndicator: CustomDropdownIndicator,
      ClearIndicator: CustomClearIndicator,
      MultiValueRemove: CustomMultiValueRemove,
      Option: CustomOption,
      IndicatorSeparator: () => null,
      ...userComponents,
    }),
    [userComponents]
  );

  return (
    <FormField
      id={reactSelectId}
      label={label}
      description={description}
      error={error}
      required={required}
      variant={variant}
    >
      <div className={cn("w-full", className)}>
        {isAsync ? (
          <AsyncSelect
            instanceId={reactSelectId}
            styles={customStyles}
            components={mergedComponents}
            isSearchable={isSearchable}
            menuPortalTarget={typeof document !== "undefined" ? document.body : null}
            menuPosition="fixed"
            menuPlacement="auto"
            maxMenuHeight={maxMenuHeight}
            loadOptions={loadOptions}
            cacheOptions={cacheOptions}
            defaultOptions={defaultOptions}
            {...props}
          />
        ) : (
          <ReactSelect
            instanceId={reactSelectId}
            styles={customStyles}
            components={mergedComponents}
            isSearchable={isSearchable}
            menuPortalTarget={typeof document !== "undefined" ? document.body : null}
            menuPosition="fixed"
            menuPlacement="auto"
            maxMenuHeight={maxMenuHeight}
            {...props}
          />
        )}
      </div>
    </FormField>
  );
}

export default Select;
