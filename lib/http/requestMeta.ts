import { CURRENT_LOCATION_LABEL, isLatLng, type Nearby } from "@/lib/geo";

const CLOUDFLARE_LOCATION_HEADERS = { lat: "cf-iplatitude", lng: "cf-iplongitude", city: "cf-ipcity" } as const;
const VERCEL_LOCATION_HEADERS = { lat: "x-vercel-ip-latitude", lng: "x-vercel-ip-longitude", city: "x-vercel-ip-city" } as const;

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

const decodeHeader = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

export function getIpLocation(headers: Headers): Nearby | null {
  const source = headers.has("cf-ray") ? CLOUDFLARE_LOCATION_HEADERS : VERCEL_LOCATION_HEADERS;
  const lat = headers.get(source.lat);
  const lng = headers.get(source.lng);
  if (!lat || !lng) return null;

  const latlng = [Number(lat), Number(lng)];
  if (!isLatLng(latlng)) return null;

  const city = headers.get(source.city);
  return { latlng, label: (city && decodeHeader(city).trim()) || CURRENT_LOCATION_LABEL, approximate: true };
}
