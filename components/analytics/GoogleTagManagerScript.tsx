"use client";

import Script from "next/script";
import React from "react";

import { GTM_ID } from "@/constants/googleTagManager";

// Rendered only after analytics consent (see ConsentAwareTracking), so the
// <noscript> iframe fallback is omitted: it could not respect consent.
export default function GoogleTagManagerScript({ nonce }: { nonce?: string }) {
    if (!GTM_ID) return null;

    return (
        <Script
            id="gtm-base"
            strategy="afterInteractive"
            nonce={nonce}
            dangerouslySetInnerHTML={{
                __html: `
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');
`,
            }}
        />
    );
}
