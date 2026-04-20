import { createHash } from "crypto";

import { META_PIXEL_ID, MetaStandardEvent } from "@/constants/metaPixel";
import type {
  CAPIEventPayload,
  CAPIResponse,
  MetaStandardEventName,
} from "@/types/metaPixel";

export function generateEventId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function sha256(value: string): string {
  return createHash("sha256")
    .update(value.trim().toLowerCase())
    .digest("hex");
}

function hasMarketingConsent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const value = document.cookie
      .split("; ")
      .find((row) => row.startsWith("ContcavCookieConsent="))
      ?.split("=")[1];

    return value === "true";
  } catch {
    return false;
  }
}

function isFbqAvailable(): boolean {
  return typeof window !== "undefined" && typeof window.fbq === "function";
}

export function pageview(): string | null {
  if (!hasMarketingConsent() || !isFbqAvailable()) return null;

  const eventId = generateEventId();
  window.fbq("track", MetaStandardEvent.PageView, {}, { eventID: eventId });
  return eventId;
}

export function trackEvent(
  name: MetaStandardEventName,
  params: Record<string, unknown> = {},
): string | null {
  if (!hasMarketingConsent() || !isFbqAvailable()) return null;

  const eventId = generateEventId();
  window.fbq("track", name, params, { eventID: eventId });
  return eventId;
}

export function trackCustomEvent(
  name: string,
  params: Record<string, unknown> = {},
): string | null {
  if (!hasMarketingConsent() || !isFbqAvailable()) return null;

  const eventId = generateEventId();
  window.fbq("trackCustom", name, params, { eventID: eventId });
  return eventId;
}



export async function sendServerEvent(
  payload: CAPIEventPayload,
): Promise<CAPIResponse | null> {

  const pixelId = META_PIXEL_ID;
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;

  if (!pixelId || !accessToken) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[Meta CAPI] Missing META_PIXEL_ID or META_CAPI_ACCESS_TOKEN — skipping server event.",
      );
    }
    return null;
  }

  const testCode = process.env.META_CAPI_TEST_CODE;

  const body: Record<string, unknown> = {
    data: [payload],
  };
  if (testCode) {
    body.test_event_code = testCode;
  }

  const url = `https://graph.facebook.com/v22.0/${pixelId}/events?access_token=${accessToken}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      console.error(
        `[Meta CAPI] HTTP ${res.status} for ${payload.event_name}:`,
        errorBody,
      );
      return null;
    }

    const json = (await res.json()) as CAPIResponse;
    return json;
  } catch (err) {
    console.error("[Meta CAPI] Network error:", err);
    return null;
  }
}

export function extractFbp(cookieString?: string): string | undefined {
  const src =
    cookieString ??
    (typeof document !== "undefined" ? document.cookie : "");
  const match = src.match(/(?:^|;\s*)_fbp=([^;]+)/);
  return match?.[1];
}

export function buildFbc(fbclid: string | null | undefined): string | undefined {
  if (!fbclid) return undefined;
  return `fb.1.${Date.now()}.${fbclid}`;
}
