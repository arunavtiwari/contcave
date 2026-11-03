"use client";

import { FiMapPin, FiSliders, FiX } from "react-icons/fi";
import { HiLocationMarker } from "react-icons/hi";

import BrowseResultLine from "@/components/listing/BrowseResultLine";
import SortMenu from "@/components/listing/SortMenu";
import { useBrowseLocation } from "@/hooks/useBrowseLocation";
import useUIStore from "@/hooks/useUIStore";

function FiltersButton() {
    const uiStore = useUIStore();
    return (
        <button
            type="button"
            onClick={() => uiStore.onOpen("filter")}
            aria-label="Filters"
            className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-background text-foreground transition hover:bg-muted"
        >
            <FiSliders size={17} aria-hidden="true" />
        </button>
    );
}

/**
 * The phone controls. Before a location is set this is an ordinary row under the heading; once
 * one is set it becomes a sticky bar, so the order in force and the way to change it stay
 * reachable however far down the grid the visitor has scrolled.
 */
export default function BrowseControlBar() {
    const { location, openPicker, clearLocation, detectState } = useBrowseLocation();
    const locating = detectState === "locating";

    if (!location) {
        return (
            <div className="mb-6 flex items-center gap-2 md:hidden">
                <button
                    type="button"
                    onClick={openPicker}
                    className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-full border border-border bg-background px-4 text-left text-sm font-medium text-foreground transition hover:bg-muted"
                >
                    <FiMapPin size={16} aria-hidden="true" className="shrink-0 text-muted-foreground" />
                    <span className="truncate">{locating ? "Finding you…" : "Where's your shoot?"}</span>
                </button>
                <SortMenu compact />
                <FiltersButton />
            </div>
        );
    }

    return (
        // Negative margins cancel Container's padding, so the bar's background and border run
        // to the edges of the screen the way a sticky bar should.
        // top-16 clears the fixed navbar (min-h-16 on phones), so the bar sticks below it
        // rather than sliding underneath.
        <div className="sticky top-16 z-30 -mx-6 mb-6 border-b border-border bg-background px-6 py-2.5 shadow-sm md:hidden">
            <div className="flex items-center gap-2">
                {/* Two sibling buttons rather than one nested in the other: an interactive
                    element inside an interactive element is reachable by neither reliably. */}
                <div className="flex h-11 min-w-0 items-center rounded-full bg-foreground pl-3.5 pr-1.5 text-sm font-semibold text-background">
                    <button
                        type="button"
                        onClick={openPicker}
                        className="flex min-w-0 items-center gap-1.5 self-stretch pr-1.5"
                    >
                        <HiLocationMarker size={15} aria-hidden="true" className="shrink-0" />
                        <span className="truncate">{location.label}</span>
                    </button>
                    <button
                        type="button"
                        onClick={clearLocation}
                        aria-label="Clear location"
                        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-background/25 transition hover:bg-background/40"
                    >
                        <FiX size={15} aria-hidden="true" />
                    </button>
                </div>
                <SortMenu compact />
                <FiltersButton />
            </div>

            <BrowseResultLine />
        </div>
    );
}
