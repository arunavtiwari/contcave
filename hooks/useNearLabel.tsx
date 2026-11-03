"use client";

import React, { createContext, useContext, useMemo, useState } from "react";

type NearLabelContextType = {
    nearLabel: string | null;
    setNearLabel: (label: string | null) => void;
};

const NearLabelContext = createContext<NearLabelContextType | undefined>(undefined);

export const NearLabelProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [nearLabel, setNearLabel] = useState<string | null>(null);
    const value = useMemo(() => ({ nearLabel, setNearLabel }), [nearLabel]);
    return <NearLabelContext.Provider value={value}>{children}</NearLabelContext.Provider>;
};

export const useNearLabel = () => {
    const context = useContext(NearLabelContext);
    if (!context) {
        throw new Error("useNearLabel must be used within a NearLabelProvider");
    }
    return context;
};
