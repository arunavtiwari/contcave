"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useConsent } from "@/components/providers/ConsentProvider";
import { META_PIXEL_ID } from "@/constants/metaPixel";
import { pageview } from "@/lib/metaPixel";

export default function MetaPixelTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTrackedRef = useRef<string>("");
  const [pixelReady, setPixelReady] = useState(false);
  const { consent } = useConsent();

  useEffect(() => {
    if (!consent.marketing) {
      lastTrackedRef.current = "";
      setPixelReady(false);
      return;
    }
    if (window.__CC_META_PIXEL_READY__) {
      setPixelReady(true);
      return;
    }
    const onReady = () => setPixelReady(true);
    window.addEventListener("cc-meta-pixel-ready", onReady, { once: true });
    return () => window.removeEventListener("cc-meta-pixel-ready", onReady);
  }, [consent.marketing]);

  useEffect(() => {
    if (!consent.marketing || !META_PIXEL_ID || !pixelReady) return;

    const url = pathname || "/";
    if (url === lastTrackedRef.current) return;
    lastTrackedRef.current = url;
    if (/^\/(dashboard|admin|pay|payments|api|auth)(?:\/|$)/.test(url)) return;
    pageview();
  }, [pathname, searchParams, consent.marketing, pixelReady]);

  return null;
}
