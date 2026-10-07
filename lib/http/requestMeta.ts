import { userAgent } from "next/server";

import { isHtmlOnlyCrawler } from "@/lib/crawlers";
import { CURRENT_LOCATION_LABEL, isLatLng, type Nearby } from "@/lib/geo";

export function isBotRequest(headers: Headers) {
  return userAgent({ headers }).isBot || isHtmlOnlyCrawler(headers.get("user-agent"));
}

const CLOUDFLARE_LOCATION_HEADERS = { lat: "cf-iplatitude", lng: "cf-iplongitude" } as const;
const VERCEL_LOCATION_HEADERS = { lat: "x-vercel-ip-latitude", lng: "x-vercel-ip-longitude" } as const;

export function getClientIp(headers: Headers) {
  return (
    headers.get("cf-connecting-ip") ||
    headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

export function getUserAgent(headers: Headers) {
  return headers.get("user-agent") || "unknown";
}

export function getIpLocation(headers: Headers): Nearby | null {
  const source = headers.has("cf-ray") ? CLOUDFLARE_LOCATION_HEADERS : VERCEL_LOCATION_HEADERS;
  const lat = headers.get(source.lat);
  const lng = headers.get(source.lng);
  if (!lat || !lng) return null;

  const latlng = [Number(lat), Number(lng)];
  if (!isLatLng(latlng)) return null;

  return { latlng, label: CURRENT_LOCATION_LABEL };
}
