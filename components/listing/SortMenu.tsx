"use client";

import { useEffect, useRef, useState } from "react";
import { FiCheck, FiChevronDown } from "react-icons/fi";

import { useBrowseLocation } from "@/hooks/useBrowseLocation";
import {
    BROWSE_SORT_LABELS,
    BROWSE_SORT_SHORT_LABELS,
    BROWSE_SORTS,
    DEFAULT_BROWSE_SORT,
    SORT_NEEDS_LOCATION,
} from "@/lib/listing/browseSort";
import { cn } from "@/lib/utils";

/**
 * Feed order. Picking an order that needs a location when none is set opens the location picker
 * rather than changing to an order that would mean nothing.
 */
export default function SortMenu({ compact = false }: { compact?: boolean }) {
    const { sort, setSort, location } = useBrowseLocation();
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!open) return;
        const onPointerDown = (event: MouseEvent) => {
            if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") setOpen(false);
        };
        document.addEventListener("mousedown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("mousedown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [open]);

    const isDefault = sort === DEFAULT_BROWSE_SORT;

    return (
        <div ref={containerRef} className="relative">
            <button
                type="button"
                onClick={() => setOpen((current) => !current)}
                aria-expanded={open}
                aria-haspopup="menu"
                className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-full border bg-background px-4 font-medium text-foreground transition hover:shadow-sm",
                    compact ? "h-11 text-sm" : "h-12 text-sm",
                    // A non-default order is a state worth noticing on the control itself.
                    isDefault ? "border-border" : "border-foreground"
                )}
            >
                <span className="whitespace-nowrap">
                    {compact ? BROWSE_SORT_SHORT_LABELS[sort] : `Sort: ${BROWSE_SORT_LABELS[sort]}`}
                </span>
                <FiChevronDown size={15} aria-hidden="true" className={cn("transition", open && "rotate-180")} />
            </button>

            {open && (
                <div
                    role="menu"
                    aria-label="Sort studios"
                    className="absolute right-0 top-[calc(100%+6px)] z-50 w-64 overflow-hidden rounded-2xl border border-border bg-background py-1 shadow-xl"
                >
                    {BROWSE_SORTS.map((option) => {
                        const blocked = SORT_NEEDS_LOCATION.has(option) && !location;
                        return (
                            <button
                                key={option}
                                type="button"
                                role="menuitemradio"
                                aria-checked={option === sort}
                                onClick={() => {
                                    setSort(option);
                                    setOpen(false);
                                }}
                                className="flex min-h-11 w-full items-center gap-3 px-4 text-left text-sm text-foreground transition hover:bg-muted"
                            >
                                <FiCheck
                                    size={15}
                                    aria-hidden="true"
                                    className={cn("shrink-0", option === sort ? "opacity-100" : "opacity-0")}
                                />
                                <span className="min-w-0 flex-1">
                                    <span className={cn("block", option === sort && "font-semibold")}>
                                        {BROWSE_SORT_LABELS[option]}
                                    </span>
                                    {blocked && (
                                        <span className="block text-xs text-muted-foreground">
                                            Pick a location first
                                        </span>
                                    )}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
