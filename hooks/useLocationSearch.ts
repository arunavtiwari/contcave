"use client";

import { useCallback } from "react";
import { toast } from "sonner";

import { AutoCompleteValue } from "@/components/ui/AutoComplete";
import { CURRENT_LOCATION_LABEL, type Nearby, NEARBY_COOKIE, serializeNearby } from "@/lib/geo";

import { useFilterNavigation } from "./useFilterNavigation";
import { useLocationSort } from "./useLocationSort";

const GEO_OPTIONS: PositionOptions = { enableHighAccuracy: false, timeout: 10_000, maximumAge: 10 * 60_000 };

const SEARCH_INSTEAD = "or search for a place instead.";

function geolocationErrorMessage(error: GeolocationPositionError) {
    switch (error.code) {
        case error.PERMISSION_DENIED:
            return `Location access is blocked for this site. Allow it in your browser settings, ${SEARCH_INSTEAD}`;
        case error.POSITION_UNAVAILABLE:
            return `Your device couldn't find its location. Turn on Location Services for this browser, ${SEARCH_INSTEAD}`;
        default:
            return `Finding your location took too long. Try again, ${SEARCH_INSTEAD}`;
    }
}

function rememberNearby(nearby: Nearby) {
    const secure = window.location.protocol === "https:" ? "; secure" : "";
    document.cookie = `${NEARBY_COOKIE}=${serializeNearby(nearby)}; path=/; samesite=lax${secure}`;
}

const placeLabel = (displayName: string) => displayName.split(",")[0]?.trim() || displayName;

export const useLocationSearch = () => {
    const { setIsLocating } = useLocationSort();
    const { refresh } = useFilterNavigation();

    const choose = useCallback((nearby: Nearby) => {
        rememberNearby(nearby);
        refresh();
    }, [refresh]);

    const handleDetectLocation = useCallback(() => {
        if (!("geolocation" in navigator)) {
            toast.error(`This browser can't share its location, ${SEARCH_INSTEAD}`);
            return;
        }
        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            ({ coords }) => {
                setIsLocating(false);
                choose({ latlng: [coords.latitude, coords.longitude], label: CURRENT_LOCATION_LABEL });
            },
            (error) => {
                setIsLocating(false);
                toast.error(geolocationErrorMessage(error));
            },
            GEO_OPTIONS
        );
    }, [setIsLocating, choose]);

    const handleManualLocation = useCallback((val: AutoCompleteValue) => {
        choose({ latlng: val.latlng, label: placeLabel(val.display_name) });
    }, [choose]);

    return {
        handleDetectLocation,
        handleManualLocation,
    };
};
