"use client";

import { FiNavigation } from "react-icons/fi";

import AutoComplete from "@/components/ui/AutoComplete";
import { useBrowseLocation } from "@/hooks/useBrowseLocation";
import type { LatLng } from "@/lib/geo";
import { regionOfPoint } from "@/lib/listing/regions";

/**
 * The expanded location picker. All of its state lives in `useBrowseLocation`, the single
 * source of truth shared with the header pill and the navbar search.
 */
export default function LocationBar() {
    const { location, pickerOpen, closePicker, setLocation, clearLocation, detect, detectState } = useBrowseLocation();
    const detecting = detectState === "locating";

    if (!pickerOpen) return null;

    return (
        <div className="mb-6 rounded-2xl border border-border bg-background shadow-sm sm:ml-auto sm:max-w-md">
            <button
                type="button"
                onClick={detect}
                disabled={detecting}
                className="flex w-full items-center gap-3 rounded-t-2xl p-4 text-left transition hover:bg-muted/40 disabled:opacity-60"
            >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
                    <FiNavigation size={17} aria-hidden="true" />
                </span>
                <span className="min-w-0">
                    <span className="block text-sm font-semibold text-foreground">
                        {detecting ? "Finding you…" : "Use my current location"}
                    </span>
                    <span className="block text-xs text-muted-foreground">Closest studios first</span>
                </span>
            </button>

            <div className="border-t border-border p-4">
                <AutoComplete
                    value=""
                    label="Or search a city or area"
                    placeholder="Search area, e.g. Andheri West"
                    enableSuggestions
                    onChange={(place) => {
                        const latlng = place.latlng as LatLng;
                        setLocation({
                            label: place.name,
                            placeId: null,
                            lat: latlng[0],
                            lng: latlng[1],
                            region: regionOfPoint(latlng)?.slug ?? null,
                            source: "search",
                        });
                    }}
                />
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
                {location && (
                    <button
                        type="button"
                        onClick={clearLocation}
                        className="h-9 rounded-full px-4 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    >
                        Clear
                    </button>
                )}
                <button
                    type="button"
                    onClick={closePicker}
                    className="h-9 rounded-full px-4 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}
