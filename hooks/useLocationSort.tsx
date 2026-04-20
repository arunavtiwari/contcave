"use client";

import React, { createContext, useContext, useState } from "react";

interface LocationSortContextType {
    sortedByLocation: boolean;
    setSortedByLocation: (val: boolean) => void;
    showSortOptions: boolean;
    setShowSortOptions: (val: boolean) => void;
    isLocating: boolean;
    setIsLocating: (val: boolean) => void;
    registerPrioritize: (fn: (lat: number, lng: number) => void) => void;
    prioritize: (lat: number, lng: number) => void;
}

const LocationSortContext = createContext<LocationSortContextType | undefined>(undefined);

export const LocationSortProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [sortedByLocation, setSortedByLocation] = useState(false);
    const [showSortOptions, setShowSortOptions] = useState(false);
    const [isLocating, setIsLocating] = useState(false);
    const prioritizeRef = React.useRef<((lat: number, lng: number) => void) | null>(null);

    const registerPrioritize = (fn: (lat: number, lng: number) => void) => {
        prioritizeRef.current = fn;
    };

    const prioritize = (lat: number, lng: number) => {
        prioritizeRef.current?.(lat, lng);
    };

    return (
        <LocationSortContext.Provider
            value={{
                sortedByLocation,
                setSortedByLocation,
                showSortOptions,
                setShowSortOptions,
                isLocating,
                setIsLocating,
                registerPrioritize,
                prioritize,
            }}
        >
            {children}
        </LocationSortContext.Provider>
    );
};

export const useLocationSort = () => {
    const context = useContext(LocationSortContext);
    if (!context) {
        throw new Error("useLocationSort must be used within a LocationSortProvider");
    }
    return context;
};
