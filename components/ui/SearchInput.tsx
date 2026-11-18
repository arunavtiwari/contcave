"use client";

import { forwardRef } from "react";
import { FiSearch, FiX } from "react-icons/fi";

import Input, { type InputProps } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

type Props = Omit<InputProps, "type" | "customLeftContent" | "customRightContent"> & {
    /** Shows a clear button while there is text; clears a controlled field. */
    onClear?: () => void;
};

/** The shared Input with a search icon and a clear button, for search and filter bars. */
const SearchInput = forwardRef<HTMLInputElement, Props>(function SearchInput({ onClear, value, className, ...props }, ref) {
    const canClear = Boolean(onClear && typeof value === "string" && value.length > 0);
    return (
        <Input
            ref={ref}
            type="search"
            value={value}
            enterKeyHint="search"
            customLeftContent={<FiSearch size={15} aria-hidden="true" />}
            customRightContent={canClear ? (
                <button
                    type="button"
                    onClick={onClear}
                    aria-label="Clear search"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                    <FiX size={15} aria-hidden="true" />
                </button>
            ) : undefined}
            className={cn("[&_input::-webkit-search-cancel-button]:hidden", className)}
            {...props}
        />
    );
});

export default SearchInput;
