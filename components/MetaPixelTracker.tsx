"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";

import { META_PIXEL_ID } from "@/constants/metaPixel";
import { pageview } from "@/lib/metaPixel";

export default function MetaPixelTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTrackedRef = useRef<string>("");

  const trackPage = useCallback(() => {
    const url = `${pathname}${searchParams?.toString() ? `?${searchParams.toString()}` : ""}`;
    if (url === lastTrackedRef.current) return;
    lastTrackedRef.current = url;

    if (!META_PIXEL_ID) return;

    pageview();
  }, [pathname, searchParams]);

  useEffect(() => {
    trackPage();
  }, [trackPage]);

  return null;
}
