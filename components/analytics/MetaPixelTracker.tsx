"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useConsent } from "@/components/providers/ConsentProvider";
import { META_PIXEL_ID } from "@/constants/metaPixel";
import { trackPageView } from "@/lib/analytics/tracking";
import { pageview } from "@/lib/metaPixel";

export default function MetaPixelTracker() {
  const pathname = usePathname();
  const lastTrackedPathRef = useRef<string>("");
  const pageViewRef = useRef<{ path: string; eventId: string } | null>(null);
  const lastMetaEventIdRef = useRef<string | null>(null);
  const [pixelReady, setPixelReady] = useState(false);
  const { consent } = useConsent();

  useEffect(() => {
    const routePath = pathname || "/";
    const currentPath = window.location.pathname || "/";
    if (currentPath !== routePath || currentPath === lastTrackedPathRef.current) return;

    lastTrackedPathRef.current = currentPath;
    const eventId = trackPageView(currentPath);
    pageViewRef.current = eventId ? { path: currentPath, eventId } : null;
    // Sent straight away; lib/metaPixel holds it until the Pixel script has loaded.
    if (eventId) lastMetaEventIdRef.current = pageview(eventId, currentPath);
  }, [pathname]);

  useEffect(() => {
    if (!consent.marketing) {
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

  // Marketing consent switched on after this page was viewed: send the PageView it missed.
  useEffect(() => {
    if (!consent.marketing || !META_PIXEL_ID || !pixelReady) return;

    const routePath = pathname || "/";
    const currentPath = window.location.pathname || "/";
    const pageView = pageViewRef.current;
    if (currentPath !== routePath || !pageView || pageView.path !== currentPath) return;
    if (lastMetaEventIdRef.current === pageView.eventId) return;

    const sentEventId = pageview(pageView.eventId, pageView.path);
    if (sentEventId) lastMetaEventIdRef.current = sentEventId;
  }, [pathname, consent.marketing, pixelReady]);

  return null;
}
