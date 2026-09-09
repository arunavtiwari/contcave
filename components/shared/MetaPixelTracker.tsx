"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";

import { useConsent } from "@/components/providers/ConsentProvider";
import { META_PIXEL_ID } from "@/constants/metaPixel";
import { pageview } from "@/lib/metaPixel";

export default function MetaPixelTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTrackedRef = useRef<string>("");
  const { consent } = useConsent();

  const trackPage = useCallback(() => {
    if (!consent.marketing || !META_PIXEL_ID) return;

    const url = `${pathname}${searchParams?.toString() ? `?${searchParams.toString()}` : ""}`;
    if (url === lastTrackedRef.current) return;
    lastTrackedRef.current = url;

    pageview();
  }, [pathname, searchParams, consent.marketing]);

  useEffect(() => {
    trackPage();
  }, [trackPage]);

  return null;
}
