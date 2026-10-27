"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FiMapPin, FiNavigation } from "react-icons/fi";
import { toast } from "sonner";

import { saveSearchLocationAction } from "@/app/actions/searchLocationActions";
import AutoComplete from "@/components/ui/AutoComplete";
import type { LatLng } from "@/lib/geo";
import { regionOfPoint } from "@/lib/listing/regions";
import {
    type FeedLocationSummary,
    parseSavedSearchLocation,
    type SavedSearchLocation,
    SEARCH_LOCATION_COOKIE,
    SEARCH_LOCATION_MAX_AGE_SECONDS,
    SEARCH_LOCATION_STORAGE_KEY,
    serializeSearchLocation,
} from "@/lib/listing/searchLocation";

type Props = {
    location: FeedLocationSummary | null;
    isLoggedIn: boolean;
};

function writeCookie(location: SavedSearchLocation | null) {
    document.cookie = location
        ? `${SEARCH_LOCATION_COOKIE}=${serializeSearchLocation(location)}; path=/; max-age=${SEARCH_LOCATION_MAX_AGE_SECONDS}; SameSite=Lax`
        : `${SEARCH_LOCATION_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

function writeStorage(location: SavedSearchLocation | null) {
    try {
        if (location) window.localStorage.setItem(SEARCH_LOCATION_STORAGE_KEY, JSON.stringify(location));
        else window.localStorage.removeItem(SEARCH_LOCATION_STORAGE_KEY);
    } catch {
        // Storage can be unavailable (private mode); the cookie still carries the choice.
    }
}

function readStorage(): SavedSearchLocation | null {
    try {
        const raw = window.localStorage.getItem(SEARCH_LOCATION_STORAGE_KEY);
        return raw ? parseSavedSearchLocation(JSON.parse(raw)) : null;
    } catch {
        return null;
    }
}

const toSaved = (label: string, latlng: LatLng): SavedSearchLocation => ({
    label,
    lat: latlng[0],
    lng: latlng[1],
    region: regionOfPoint(latlng)?.slug ?? null,
});

/** "Showing studios in {Region} · Change", with GPS detection and an area search to set it. */
export default function LocationBar({ location, isLoggedIn }: Props) {
    const router = useRouter();
    const [editing, setEditing] = useState(false);
    const [detecting, setDetecting] = useState(false);
    const restoredRef = useRef(false);

    const persist = async (next: SavedSearchLocation | null) => {
        writeCookie(next);
        writeStorage(next);
        setEditing(false);
        if (isLoggedIn) await saveSearchLocationAction({ location: next }).catch(() => undefined);
        router.refresh();
    };

    // The cookie can be cleared while localStorage survives; restore the choice so IP never takes over.
    useEffect(() => {
        if (restoredRef.current || location?.source === "saved" || location?.source === "search") return;
        restoredRef.current = true;
        const stored = readStorage();
        if (stored) {
            writeCookie(stored);
            router.refresh();
        }
    }, [location?.source, router]);

    const detect = () => {
        if (!navigator.geolocation) {
            toast.error("Location isn't available in this browser. Please enter an area instead.");
            return;
        }
        setDetecting(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setDetecting(false);
                const latlng: LatLng = [position.coords.latitude, position.coords.longitude];
                void persist(toSaved(regionOfPoint(latlng)?.name ?? "Your location", latlng));
            },
            () => {
                setDetecting(false);
                toast.error("Couldn't get your location. Please enter an area or city instead.");
            },
            { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 }
        );
    };

    const summary = location
        ? location.source === "search"
            ? `Showing studios near ${location.label}`
            : `Showing studios in ${location.regionName ?? location.label}`
        : null;

    if (summary && !editing) {
        return (
            <div className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                <FiMapPin size={16} className="text-foreground" aria-hidden="true" />
                <span className="text-foreground">{summary}</span>
                {location?.source !== "search" && (
                    <>
                        <span aria-hidden="true">·</span>
                        <button type="button" onClick={() => setEditing(true)} className="font-medium text-foreground underline underline-offset-4">
                            Change
                        </button>
                    </>
                )}
            </div>
        );
    }

    return (
        <div className="mb-6 flex flex-col gap-3 rounded-xl border border-border bg-muted/30 p-4 sm:flex-row sm:items-center">
            <button
                type="button"
                onClick={detect}
                disabled={detecting}
                className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60"
            >
                <FiNavigation size={15} aria-hidden="true" />
                {detecting ? "Detecting…" : "Detect my location"}
            </button>
            <span className="shrink-0 text-sm text-muted-foreground">or enter city / area</span>
            <div className="min-w-0 flex-1">
                <AutoComplete
                    value=""
                    placeholder="e.g. Noida Sector 18, Andheri West"
                    enableSuggestions
                    onChange={(place) => void persist(toSaved(place.name, place.latlng as LatLng))}
                />
            </div>
            {(editing || location?.source === "saved") && (
                <div className="flex shrink-0 gap-3 text-sm">
                    {location?.source === "saved" && (
                        <button type="button" onClick={() => void persist(null)} className="text-muted-foreground underline underline-offset-4">
                            Clear
                        </button>
                    )}
                    {editing && (
                        <button type="button" onClick={() => setEditing(false)} className="text-muted-foreground underline underline-offset-4">
                            Cancel
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
