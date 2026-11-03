"use client";

import { FiMapPin, FiNavigation } from "react-icons/fi";

import { useBrowseLocation } from "@/hooks/useBrowseLocation";
import { useNearLabel } from "@/hooks/useNearLabel";

export default function ListingFeedHeader({ title = "Explore studios" }: { title?: string }) {
    const { nearLabel } = useNearLabel();
    const { location, detectState, openPicker, detect } = useBrowseLocation();
    const detecting = detectState === "locating";

    const formatHeading = () => {
        if (!nearLabel) return title;
        const normalized = nearLabel.toLowerCase().trim();
        if (normalized === "nearby" || normalized === "you" || normalized === "current location") {
            return "Studios nearby";
        }
        return `Studios near ${nearLabel}`;
    };

    return (
        <div className="mb-6 flex items-center justify-between gap-3">
            <h1 className="min-w-0 truncate text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                {formatHeading()}
            </h1>

            {/* Search-bar anatomy: a label segment that opens the picker, with the
                detect action as a filled circle pinned to the trailing edge. */}
            <div className="flex h-12 max-w-[52%] shrink-0 items-center rounded-full border border-border bg-background p-1 pl-4 shadow-xs transition hover:shadow-sm sm:w-80 sm:max-w-none">
                <button
                    type="button"
                    onClick={openPicker}
                    className="flex min-w-0 flex-1 items-center gap-2 pr-3 text-left text-sm font-medium text-foreground"
                >
                    <FiMapPin size={15} className="shrink-0 text-muted-foreground" aria-hidden="true" />
                    {location ? (
                        <span className="truncate">{location.label}</span>
                    ) : (
                        <>
                            <span className="truncate sm:hidden">Set location</span>
                            <span className="hidden truncate sm:inline">Search city or area</span>
                        </>
                    )}
                </button>

                <button
                    type="button"
                    onClick={detect}
                    disabled={detecting}
                    aria-label="Use my current location"
                    title="Use my current location"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition hover:opacity-90 disabled:opacity-60"
                >
                    <FiNavigation size={16} className={detecting ? "animate-pulse" : undefined} aria-hidden="true" />
                </button>
            </div>
        </div>
    );
}
