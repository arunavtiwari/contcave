"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import {
  type TrackedStudio,
  trackNewTabLinkClick,
  trackOutboundLinkClick,
  trackPageView,
  trackWhatsAppContact,
} from "@/lib/analytics/tracking";

const isWhatsAppHost = (hostname: string) =>
  hostname === "wa.me" || hostname.endsWith(".wa.me") || hostname === "api.whatsapp.com";

const isPrivatePath = (pathname: string) =>
  /^\/(dashboard|admin|pay|payments|api|auth)(?:\/|$)/.test(pathname);

export default function JourneyEventTracker() {
  const pathname = usePathname();

  useEffect(() => {
    trackPageView(pathname || "/");
  }, [pathname]);

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      if (event.defaultPrevented || !(event.target instanceof Element)) return;
      const anchor = event.target.closest<HTMLAnchorElement>("a[href]");
      if (!anchor) return;

      let destination: URL;
      try {
        destination = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }

      const opensNewTab = anchor.target.toLowerCase() === "_blank"
        || event.metaKey
        || event.ctrlKey
        || event.button === 1;

      if (isWhatsAppHost(destination.hostname)) {
        if (isPrivatePath(window.location.pathname)) return;
        const data = anchor.dataset;
        const studio: TrackedStudio | null = data.studioId && data.studioName
          ? {
              id: data.studioId,
              name: data.studioName,
              category: data.studioCategory || null,
              city: data.studioCity || null,
            }
          : null;
        const source = data.trackingSource === "curated_request_price"
          ? "curated_request_price"
          : "whatsapp_link";
        trackWhatsAppContact({ source, studio });
        return;
      }

      if (destination.origin === window.location.origin) {
        if (opensNewTab) trackNewTabLinkClick(destination.pathname);
        return;
      }

      trackOutboundLinkClick(destination.hostname, opensNewTab);
    };

    document.addEventListener("click", onDocumentClick, true);
    return () => document.removeEventListener("click", onDocumentClick, true);
  }, []);

  return null;
}
