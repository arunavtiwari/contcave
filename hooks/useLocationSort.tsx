"use client";

import React, { createContext, useContext, useMemo, useState } from "react";

interface LocationSortContextType {
    nearLabel: string | null;
    setNearLabel: (val: string | null) => void;
    showSortOptions: boolean;
    setShowSortOptions: (val: boolean) => void;
    isLocating: boolean;
    setIsLocating: (val: boolean) => void;
}

const LocationSortContext = createContext<LocationSortContextType | undefined>(undefined);

export const LocationSortProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [nearLabel, setNearLabel] = useState<string | null>(null);
    const [showSortOptions, setShowSortOptions] = useState(false);
    const [isLocating, setIsLocating] = useState(false);

    const value = useMemo(
        () => ({ nearLabel, setNearLabel, showSortOptions, setShowSortOptions, isLocating, setIsLocating }),
        [nearLabel, showSortOptions, isLocating]
    );

    return <LocationSortContext.Provider value={value}>{children}</LocationSortContext.Provider>;
};

export const useLocationSort = () => {
    const context = useContext(LocationSortContext);
    if (!context) {
        throw new Error("useLocationSort must be used within a LocationSortProvider");
    }
    return context;
};
