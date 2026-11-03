"use client";

import { type KeyboardEvent, useCallback, useEffect, useMemo, useState } from "react";

import type { PickerRow } from "@/components/listing/LocationPickerRows";
import { useBrowseLocation } from "@/hooks/useBrowseLocation";
import {
    type AreaSuggestion,
    MIN_SUGGESTION_CHARS,
    SUGGESTION_DEBOUNCE_MS,
    useGooglePlaces,
} from "@/hooks/useGooglePlaces";
import { POPULAR_AREAS } from "@/lib/listing/browseLocation";
import { regionOfPoint } from "@/lib/listing/regions";

/** How long to wait for the Maps script before calling suggestions unavailable. */
const PLACES_WAIT_MS = 5_000;

/**
 * The picker's behaviour - typing, suggestions, keyboard movement, picking - with no markup, so
 * the desktop dropdown and the mobile sheet behave identically.
 */
export function useLocationPicker() {
    const { recents, detect, detectState, setLocation, closePicker, pickerOpen } = useBrowseLocation();
    const { load, whenReady, suggestAreas, resolvePlace } = useGooglePlaces();

    const [query, setQuery] = useState("");
    const [suggestions, setSuggestions] = useState<AreaSuggestion[]>([]);
    const [suggestionsFailed, setSuggestionsFailed] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);

    const typing = query.trim().length >= MIN_SUGGESTION_CHARS;

    // Each open starts fresh; a stale query would otherwise show yesterday's suggestions.
    useEffect(() => {
        if (!pickerOpen) {
            setQuery("");
            setSuggestions([]);
            setSuggestionsFailed(false);
            setActiveIndex(0);
        }
    }, [pickerOpen]);

    useEffect(() => {
        if (!typing) {
            setSuggestions([]);
            setSuggestionsFailed(false);
            return;
        }
        load();
        let cancelled = false;
        const timer = setTimeout(async () => {
            const ready = await whenReady(PLACES_WAIT_MS);
            if (cancelled) return;
            if (!ready) {
                setSuggestionsFailed(true);
                return;
            }
            const result = await suggestAreas(query);
            if (cancelled) return;
            setSuggestionsFailed(!result.ok);
            setSuggestions(result.ok ? result.suggestions : []);
            // The first area is pre-selected, so Enter picks the obvious one.
            setActiveIndex(result.ok && result.suggestions.length ? 1 : 0);
        }, SUGGESTION_DEBOUNCE_MS);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [query, typing, load, whenReady, suggestAreas]);

    // The detect row stays at the top whether or not anything has been typed.
    const rows = useMemo<PickerRow[]>(
        () => [
            { kind: "detect" },
            ...(typing
                ? suggestions.map((suggestion): PickerRow => ({ kind: "suggestion", suggestion }))
                : recents.map((location): PickerRow => ({ kind: "recent", location }))),
        ],
        [typing, suggestions, recents]
    );

    const pick = useCallback(
        async (row: PickerRow) => {
            if (row.kind === "detect") {
                detect();
                return;
            }
            if (row.kind === "recent") {
                setLocation({ ...row.location, source: "recent" });
                return;
            }
            const resolved = await resolvePlace(row.suggestion);
            if (!resolved) {
                setSuggestionsFailed(true);
                return;
            }
            setLocation({
                label: resolved.label,
                placeId: resolved.placeId,
                lat: resolved.latlng[0],
                lng: resolved.latlng[1],
                region: regionOfPoint(resolved.latlng)?.slug ?? null,
                source: "search",
            });
        },
        [detect, resolvePlace, setLocation]
    );

    const pickPopular = useCallback(
        (label: string) => {
            const area = POPULAR_AREAS.find((entry) => entry.label === label);
            if (!area) return;
            setLocation({
                label: area.label,
                placeId: null,
                lat: area.latlng[0],
                lng: area.latlng[1],
                region: regionOfPoint(area.latlng)?.slug ?? null,
                source: "popular",
            });
        },
        [setLocation]
    );

    const onKeyDown = useCallback(
        (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                event.preventDefault();
                closePicker();
                return;
            }
            if (event.key === "ArrowDown") {
                event.preventDefault();
                setActiveIndex((index) => (index + 1) % rows.length);
                return;
            }
            if (event.key === "ArrowUp") {
                event.preventDefault();
                setActiveIndex((index) => (index - 1 + rows.length) % rows.length);
                return;
            }
            if (event.key === "Enter") {
                event.preventDefault();
                const row = rows[activeIndex];
                if (row) void pick(row);
            }
        },
        [activeIndex, closePicker, pick, rows]
    );

    return {
        query,
        setQuery,
        typing,
        rows,
        activeIndex,
        setActiveIndex,
        suggestionsFailed,
        detectState,
        onKeyDown,
        pick,
        pickPopular,
        popularAreas: POPULAR_AREAS,
    };
}
