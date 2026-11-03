"use client";

import React, { createContext, useContext, useMemo, useState } from "react";

export type LocationBarBridge = {
    label: string | null;
    detecting: boolean;
    onDetect: () => void;
    onEdit: () => void;
};

const DEFAULT_LOCATION_BAR: LocationBarBridge = {
    label: null,
    detecting: false,
    onDetect: () => {},
    onEdit: () => {},
};

type NearLabelContextType = {
    nearLabel: string | null;
    setNearLabel: (label: string | null) => void;
    // Bridges LocationBar's state/actions (resolved behind a Suspense boundary)
    // up to ListingFeedHeader, which renders instantly above it.
    locationBar: LocationBarBridge;
    setLocationBar: (bridge: LocationBarBridge) => void;
};

const NearLabelContext = createContext<NearLabelContextType | undefined>(undefined);

export const NearLabelProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [nearLabel, setNearLabel] = useState<string | null>(null);
    const [locationBar, setLocationBar] = useState<LocationBarBridge>(DEFAULT_LOCATION_BAR);
    const value = useMemo(
        () => ({ nearLabel, setNearLabel, locationBar, setLocationBar }),
        [nearLabel, locationBar]
    );
    return <NearLabelContext.Provider value={value}>{children}</NearLabelContext.Provider>;
};

export const useNearLabel = () => {
    const context = useContext(NearLabelContext);
    if (!context) {
        throw new Error("useNearLabel must be used within a NearLabelProvider");
    }
    return context;
};
