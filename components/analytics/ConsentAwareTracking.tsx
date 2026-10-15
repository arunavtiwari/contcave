"use client";

import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import React, { useEffect } from "react";

import GoogleTagManagerScript from "@/components/analytics/GoogleTagManagerScript";
import MetaPixelScript from "@/components/analytics/MetaPixelScript";
import MetaPixelTracker from "@/components/analytics/MetaPixelTracker";
import { useConsent } from "@/components/providers/ConsentProvider";
import { updateConsentMode } from "@/lib/analytics/tracking";

interface Props {
    nonce?: string;
}

export default function ConsentAwareTracking({ nonce }: Props) {
    const { consent, isInitialized } = useConsent();

    // Keep Google Consent Mode in step with the banner; GTM itself loads for everyone.
    useEffect(() => {
        if (isInitialized) updateConsentMode(consent);
    }, [consent, isInitialized]);

    return (
        <>
            <GoogleTagManagerScript nonce={nonce} />

            {/* Analytics Category */}
            {isInitialized && consent.analytics && (
                <>
                    <Analytics />
                    <SpeedInsights />
                </>
            )}

            {/* Marketing Category */}
            {isInitialized && consent.marketing && (
                <>
                    <MetaPixelScript nonce={nonce} />
                    <MetaPixelTracker />
                </>
            )}
        </>
    );
}
