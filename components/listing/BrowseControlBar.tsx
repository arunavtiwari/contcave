"use client";

import { FiMapPin, FiX } from "react-icons/fi";
import { HiLocationMarker } from "react-icons/hi";

import BrowseResultLine from "@/components/listing/BrowseResultLine";
import SortMenu from "@/components/listing/SortMenu";
import Spinner from "@/components/ui/Spinner";
import { useBrowseLocation } from "@/hooks/useBrowseLocation";

/**
 * The phone controls. Before a location is set this is an ordinary row under the heading; once
 * one is set it becomes a sticky bar, so the order in force and the way to change it stay
 * reachable however far down the grid the visitor has scrolled.
 */
export default function BrowseControlBar() {
    const { location, openPicker, clearLocation, detectState, cancelDetect } = useBrowseLocation();
    const locating = detectState === "locating";

    if (!location) {
        return (
            <div className="mb-6 flex items-center gap-2 md:hidden">
                {locating ? (
                    // A wait with no way out is worse than no location at all.
                    <button
                        type="button"
                        onClick={cancelDetect}
                        className="flex h-11 min-w-0 flex-1 items-center justify-between gap-2 rounded-full border border-border bg-background px-4 text-sm font-medium text-foreground"
                    >
                        <span className="flex min-w-0 items-center gap-2">
                            <Spinner />
                            <span className="truncate">Finding you…</span>
                        </span>
                        <span className="shrink-0 text-muted-foreground">Cancel</span>
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={openPicker}
                        className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-full border border-border bg-background px-4 text-left text-sm font-medium text-foreground transition hover:bg-muted"
                    >
                        <FiMapPin size={16} aria-hidden="true" className="shrink-0 text-muted-foreground" />
                        <span className="truncate">Where&apos;s your shoot?</span>
                    </button>
                )}
                <SortMenu compact />
            </div>
        );
    }

    return (
        // Negative margins cancel Container's padding, so the bar's background and border run
        // to the edges of the screen the way a sticky bar should.
        // top-16 clears the fixed navbar (min-h-16 on phones), so the bar sticks below it
        // rather than sliding underneath.
        <div className="sticky top-16 z-30 -mx-6 mb-6 border-b border-border bg-background px-6 py-2.5 md:hidden">
            <div className="flex items-center gap-2">
                <div className="flex h-11 min-w-0 flex-1 items-center rounded-full border border-foreground bg-background pl-4 pr-1 text-sm font-semibold text-foreground">
                    <button
                        type="button"
                        onClick={openPicker}
                        aria-label={`Change location, now ${location.label}`}
                        className="flex min-w-0 flex-1 items-center gap-2 self-stretch text-left"
                    >
                        <HiLocationMarker size={16} aria-hidden="true" className="shrink-0" />
                        <span className="truncate">{location.label}</span>
                    </button>
                    <button
                        type="button"
                        onClick={clearLocation}
                        aria-label="Clear location"
                        className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    >
                        <FiX size={16} aria-hidden="true" />
                    </button>
                </div>
                <SortMenu compact />
            </div>

            <BrowseResultLine />
        </div>
    );
}
