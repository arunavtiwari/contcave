"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { z } from "zod";

const consentSchema = z.object({
    necessary: z.boolean().default(true),
    analytics: z.boolean().default(false),
    marketing: z.boolean().default(false),
});

export type ConsentState = z.infer<typeof consentSchema>;

interface ConsentContextType {
    consent: ConsentState;
    isInitialized: boolean;
    updateConsent: (newConsent: Partial<ConsentState>) => void;
    acceptAll: () => void;
    declineAll: () => void;
}

const COOKIE_NAME = "CC_CONSENT";
const DEFAULT_CONSENT: ConsentState = {
    necessary: true,
    analytics: false,
    marketing: false,
};

const ConsentContext = createContext<ConsentContextType | undefined>(undefined);

export const useConsent = () => {
    const context = useContext(ConsentContext);
    if (!context) {
        throw new Error("useConsent must be used within a ConsentProvider");
    }
    return context;
};

export const ConsentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [consent, setConsent] = useState<ConsentState>(DEFAULT_CONSENT);
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem(COOKIE_NAME);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                const result = consentSchema.safeParse(parsed);
                if (result.success) {
                    setConsent(result.data);
                }
            } catch (e) {
                console.error("Failed to parse consent", e);
            }
        }
        setIsInitialized(true);
    }, []);

    const saveConsent = (state: ConsentState) => {
        setConsent(state);
        localStorage.setItem(COOKIE_NAME, JSON.stringify(state));

        // Also set a cookie for server-side awareness if needed
        const expires = new Date(Date.now() + 365 * 864e5).toUTCString();
        document.cookie = `${COOKIE_NAME}=${JSON.stringify(state)}; expires=${expires}; path=/; SameSite=Lax`;

        // Dispatch event for non-React scripts
        window.dispatchEvent(new CustomEvent("consent-update", { detail: state }));
    };

    const updateConsent = (newConsent: Partial<ConsentState>) => {
        saveConsent({ ...consent, ...newConsent, necessary: true });
    };

    const acceptAll = () => {
        saveConsent({ necessary: true, analytics: true, marketing: true });
    };

    const declineAll = () => {
        saveConsent({ necessary: true, analytics: false, marketing: false });
    };

    return (
        <ConsentContext.Provider value={{ consent, isInitialized, updateConsent, acceptAll, declineAll }}>
            {children}
        </ConsentContext.Provider>
    );
};
