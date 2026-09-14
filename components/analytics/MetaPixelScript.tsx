"use client";

import Image from "next/image";
import Script from "next/script";
import React from "react";

import { useConsent } from "@/components/providers/ConsentProvider";
import { META_PIXEL_ID } from "@/constants/metaPixel";

export default function MetaPixelScript({ nonce }: { nonce?: string }) {
    const { consent, isInitialized } = useConsent();

    if (!isInitialized || !META_PIXEL_ID || !consent.marketing) return null;

    return (
        <>
            <Script
                id="meta-pixel-base"
                strategy="afterInteractive"
                nonce={nonce}
                dangerouslySetInnerHTML={{
                    __html: `
!function(f,b,e,v,n,t,s){
  if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;
  n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];
  t=b.createElement(e);t.async=!0;
  t.src=v;
  s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)
}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${META_PIXEL_ID}');
fbq('track','PageView');
`,
                }}
            />
            <noscript>
                <Image
                    height={1}
                    width={1}
                    style={{ display: "none" }}
                    src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
                    alt="Meta Pixel"
                    unoptimized
                    priority
                />
            </noscript>
        </>
    );
}
