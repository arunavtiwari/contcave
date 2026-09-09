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
  size?: "sm" | "md" | "lg";
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
  return (
    <components.DropdownIndicator {...props}>
      <FiChevronDown
        size={15}
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
  return (
    <components.ClearIndicator {...props}>
      <FiX
        size={14}
        className="text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
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
      <FiX size={12} className="hover:text-destructive transition-colors" />
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
  return (
    <components.Option {...props}>
      <div className="flex w-full items-center justify-between gap-2">
        <span
          className={cn(
            "truncate text-xs md:text-sm",
            props.isSelected ? "font-semibold text-foreground" : "font-normal text-foreground"
          )}
        >
          {props.children}
        </span>
        {props.isSelected && (
          <FiCheck size={14} className="shrink-0 text-foreground" />
        )}
      </div>
    </components.Option>
  );
};

export const getSelectStyles = <
  Option = SelectOption,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>
>(
  size: "sm" | "md" | "lg" = "sm",
  error?: string
): StylesConfig<Option, IsMulti, Group> => ({
  control: (provided, state) => ({
    ...provided,
    backgroundColor: "var(--color-background)",
    borderWidth: "1px",
    borderColor: error
      ? "var(--color-destructive)"
      : state.isFocused
      ? "var(--color-foreground)"
      : "var(--color-border)",
    borderRadius: "0.5rem",
    padding: "0",
    boxShadow: state.isFocused
      ? error
        ? "0 0 0 1px var(--color-destructive)"
        : "0 0 0 1px var(--color-foreground)"
      : "none",
    minHeight: size === "sm" ? "36px" : size === "lg" ? "44px" : "40px",
    height: size === "sm" ? "36px" : size === "lg" ? "44px" : "40px",
    fontSize: size === "sm" ? "0.8125rem" : "0.875rem",
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
    fontSize: size === "sm" ? "0.8125rem" : "0.875rem",
    margin: 0,
    padding: 0,
    color: "var(--color-foreground)",
    fontWeight: 400,
  }),
  valueContainer: (provided) => ({
    ...provided,
    padding: "0 10px",
    gap: "4px",
  }),
  singleValue: (provided) => ({
    ...provided,
    margin: 0,
    fontSize: size === "sm" ? "0.8125rem" : "0.875rem",
    fontWeight: 400,
    color: "var(--color-foreground)",
  }),
  placeholder: (provided) => ({
    ...provided,
    margin: 0,
    fontSize: size === "sm" ? "0.8125rem" : "0.875rem",
    fontWeight: 400,
    color: "var(--color-muted-foreground)",
  }),
  option: (provided, state) => ({
    ...provided,
    cursor: "pointer",
    fontSize: size === "sm" ? "0.8125rem" : "0.875rem",
    padding: "7px 10px",
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
    borderRadius: "0.75rem",
    overflow: "hidden",
    marginTop: "4px",
    boxShadow: "none",
    border: "1px solid var(--color-border)",
    backgroundColor: "var(--color-background)",
    padding: "4px",
    zIndex: 9999,
  }),
  menuList: (provided) => ({
    ...provided,
    padding: "2px",
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  }),
  menuPortal: (base) => ({ ...base, zIndex: 99999 }),
  indicatorSeparator: () => ({ display: "none" }),
  dropdownIndicator: (provided) => ({
    ...provided,
    padding: "0 8px",
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
});

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
