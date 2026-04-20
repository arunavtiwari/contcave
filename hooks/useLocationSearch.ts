"use client";

import { useCallback } from "react";

import { AutoCompleteValue } from "@/components/inputs/AutoComplete";

import { useLocationSort } from "./useLocationSort";

const GEO_TIMEOUT = 8000;

export const useLocationSearch = () => {
    const { setIsLocating, prioritize } = useLocationSort();

    const handleDetectLocation = useCallback(() => {
        if (!("geolocation" in navigator)) {
            alert("Geolocation is not supported by your browser");
            return;
        }
        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setIsLocating(false);
                const { latitude, longitude } = position.coords;
                prioritize(latitude, longitude);
            },
            () => {
                setIsLocating(false);
                alert("Unable to retrieve your location");
            },
            { enableHighAccuracy: false, timeout: GEO_TIMEOUT }
        );
    }, [setIsLocating, prioritize]);

    const handleManualLocation = useCallback((val: AutoCompleteValue) => {
        prioritize(val.latlng[0], val.latlng[1]);
    }, [prioritize]);

    return {
        handleDetectLocation,
        handleManualLocation,
    };
};
