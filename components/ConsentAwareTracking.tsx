"use client";

import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import React from "react";

import MetaPixelScript from "@/components/MetaPixelScript";
import MetaPixelTracker from "@/components/MetaPixelTracker";
import { useConsent } from "@/components/providers/ConsentProvider";

interface Props {
    nonce?: string;
}

export default function ConsentAwareTracking({ nonce }: Props) {
    const { consent, isInitialized } = useConsent();

    if (!isInitialized) return null;

    return (
        <>
            {/* Analytics Category */}
            {consent.analytics && (
                <>
                    <Analytics />
                    <SpeedInsights />
                </>
            )}

            {/* Marketing Category */}
            {consent.marketing && (
                <>
                    <MetaPixelScript nonce={nonce} />
                    <MetaPixelTracker />
                </>
            )}
        </>
    );
}
