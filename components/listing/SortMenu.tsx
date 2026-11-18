"use client";

import { FiChevronDown } from "react-icons/fi";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { useBrowseLocation } from "@/hooks/useBrowseLocation";
import {
    BROWSE_SORT_LABELS,
    BROWSE_SORT_SHORT_LABELS,
    BROWSE_SORTS,
    DEFAULT_BROWSE_SORT,
    parseBrowseSort,
    SORT_NEEDS_LOCATION,
} from "@/lib/listing/browseSort";
import { cn } from "@/lib/utils";

/**
 * Feed order. Picking an order that needs a location when none is set opens the location picker
 * rather than changing to an order that would mean nothing.
 */
export default function SortMenu({ compact = false }: { compact?: boolean }) {
    const { sort, setSort, location } = useBrowseLocation();
    const isDefault = sort === DEFAULT_BROWSE_SORT;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    className={cn(
                        "group flex shrink-0 items-center gap-1.5 rounded-full border bg-background px-4 font-medium text-foreground transition hover:shadow-sm",
                        compact ? "h-11 text-sm" : "h-12 text-sm",
                        // A non-default order is a state worth noticing on the control itself.
                        isDefault ? "border-border" : "border-foreground"
                    )}
                >
                    <span className="whitespace-nowrap">
                        {compact ? BROWSE_SORT_SHORT_LABELS[sort] : `Sort: ${BROWSE_SORT_LABELS[sort]}`}
                    </span>
                    <FiChevronDown size={15} aria-hidden="true" className="transition group-data-[state=open]:rotate-180" />
                </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent surface="solid" sideOffset={6} aria-label="Sort studios" className="w-64">
                <DropdownMenuRadioGroup value={sort} onValueChange={(value) => setSort(parseBrowseSort(value))}>
                    {BROWSE_SORTS.map((option) => (
                        <DropdownMenuRadioItem
                            key={option}
                            value={option}
                            label={BROWSE_SORT_LABELS[option]}
                            hint={SORT_NEEDS_LOCATION.has(option) && !location ? "Pick a location first" : undefined}
                        />
                    ))}
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
