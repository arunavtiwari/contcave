"use client";

import { useCallback, useSyncExternalStore } from "react";

import { publicHostname } from "@/lib/http/adminHost";

const subscribe = () => () => {};

function publicOrigin() {
  const url = new URL(window.location.origin);
  url.hostname = publicHostname(url.hostname);
  return url.origin;
}

export function usePublicSiteUrl() {
  const origin = useSyncExternalStore(subscribe, publicOrigin, () => null);
  return useCallback((path: string) => (origin ? `${origin}${path}` : path), [origin]);
}
