"use client";

import React from "react";
import ReactSelect, { GroupBase, Props as SelectProps, StylesConfig } from "react-select";
import AsyncSelect from "react-select/async";

import FormField from "@/components/inputs/FormField";
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
> extends SelectProps<Option, IsMulti, Group> {
    variant?: "vertical" | "horizontal";
    size?: "sm" | "md" | "lg";
    error?: string;
    className?: string;
    isAsync?: boolean;
    loadOptions?: (inputValue: string, callback: (options: Option[]) => void) => Promise<Option[]> | void;
    cacheOptions?: boolean;
    defaultOptions?: boolean | Option[];
}

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
        borderRadius: "0.75rem",
        padding: "0",
        boxShadow: "none",
        minHeight: size === "sm" ? "40px" : size === "lg" ? "48px" : "44px",
        height: size === "sm" ? "40px" : size === "lg" ? "48px" : "44px",
        fontSize: size === "sm" ? "0.875rem" : "0.875rem",
        transition: "all 0.2s ease",
        "&:hover": {
            borderColor: error
                ? "var(--color-destructive)"
                : state.isFocused
                    ? "var(--color-foreground)"
                    : "var(--color-border)",
        },
    }),
    input: (provided) => ({
        ...provided,
        fontSize: size === "sm" ? "0.875rem" : "0.875rem",
        margin: 0,
        padding: 0,
        color: "var(--color-foreground)",
        fontWeight: 400,
    }),
    valueContainer: (provided) => ({
        ...provided,
        padding: size === "sm" ? "0 12px" : "0 12px",
    }),
    singleValue: (provided) => ({
        ...provided,
        margin: 0,
        fontSize: size === "sm" ? "0.875rem" : "0.875rem",
        fontWeight: 400,
        color: "var(--color-foreground)",
    }),
    placeholder: (provided) => ({
        ...provided,
        fontSize: size === "sm" ? "0.875rem" : "0.875rem",
        fontWeight: 400,
        color: "var(--color-muted-foreground)",
    }),
    option: (provided, state) => ({
        ...provided,
        cursor: "pointer",
        fontSize: size === "sm" ? "0.875rem" : "0.875rem",
        padding: "10px 12px",
        backgroundColor: state.isSelected
            ? "var(--color-foreground)"
            : state.isFocused
                ? "var(--color-muted)"
                : "transparent",
        color: state.isSelected
            ? "var(--color-background)"
            : "var(--color-foreground)",
        ":active": {
            backgroundColor: state.isSelected
                ? "var(--color-foreground)"
                : "var(--color-muted)",
        },
    }),
    menu: (provided) => ({
        ...provided,
        borderRadius: "0.75rem",
        overflow: "hidden",
        marginTop: "6px",
        boxShadow: "none",
        border: "1px solid var(--color-border)",
        backgroundColor: "var(--color-background)",
        zIndex: 9999,
    }),
    menuPortal: (base) => ({ ...base, zIndex: 99999 }),
    indicatorSeparator: () => ({ display: "none" }),
    dropdownIndicator: (provided, state) => ({
        ...provided,
        color: state.isFocused ? "var(--color-foreground)" : "var(--color-muted-foreground)",
        padding: size === "sm" ? "0 12px" : "0 16px",
        "&:hover": {
            color: "var(--color-foreground)",
        },
    }),
    indicatorsContainer: (provided) => ({
        ...provided,
        paddingRight: size === "sm" ? "4px" : "4px",
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
    maxMenuHeight = 300,
    ...props
}: CustomSelectProps<Option, IsMulti, Group> & { label?: string; description?: string; required?: boolean }) {
    const reactSelectId = React.useId();
    const customStyles = getSelectStyles<Option, IsMulti, Group>(size, error);

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
