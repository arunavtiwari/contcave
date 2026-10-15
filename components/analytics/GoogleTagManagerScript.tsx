"use client";

import Script from "next/script";
import React from "react";

import { GTM_ID } from "@/constants/googleTagManager";
import { CONSENT_COOKIE_NAME } from "@/lib/consent";

// Loaded for every visitor under Google Consent Mode v2: everything defaults to "denied",
// a choice saved earlier is restored before GTM starts, and ConsentAwareTracking sends an
// "update" whenever the visitor accepts or declines. While denied, Google tags send only
// cookieless pings. The <noscript> iframe fallback is omitted: it can't carry consent state.
export default function GoogleTagManagerScript({ nonce }: { nonce?: string }) {
    if (!GTM_ID) return null;

    return (
        <Script
            id="gtm-base"
            strategy="afterInteractive"
            nonce={nonce}
            dangerouslySetInnerHTML={{
                __html: `
window.dataLayer=window.dataLayer||[];
window.gtag=window.gtag||function(){window.dataLayer.push(arguments);};
gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',wait_for_update:500});
try{var c=JSON.parse(localStorage.getItem('${CONSENT_COOKIE_NAME}')||'null');
if(c){var a=c.marketing?'granted':'denied';gtag('consent','update',{ad_storage:a,ad_user_data:a,ad_personalization:a,analytics_storage:c.analytics?'granted':'denied'});}}catch(e){}
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
