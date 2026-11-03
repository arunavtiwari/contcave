"use client";

import React, { createContext, useContext, useMemo, useState } from "react";

export type FeedSummary = {
    /** The place the feed was ordered around, when it came from a search. */
    nearLabel: string | null;
    /** How many studios match, or null until the feed has resolved. */
    total: number | null;
};

type FeedSummaryContextType = FeedSummary & {
    setFeedSummary: (summary: FeedSummary) => void;
};

const EMPTY: FeedSummary = { nearLabel: null, total: null };

const FeedSummaryContext = createContext<FeedSummaryContextType | undefined>(undefined);

/**
 * Carries what the feed knows - its result count and the place it was ordered around - up to the
 * header, which renders above the feed's Suspense boundary and so can't read it directly.
 */
export const FeedSummaryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [summary, setFeedSummary] = useState<FeedSummary>(EMPTY);
    const value = useMemo(() => ({ ...summary, setFeedSummary }), [summary]);
    return <FeedSummaryContext.Provider value={value}>{children}</FeedSummaryContext.Provider>;
};

export const useFeedSummary = () => {
    const context = useContext(FeedSummaryContext);
    if (!context) throw new Error("useFeedSummary must be used within a FeedSummaryProvider");
    return context;
};
