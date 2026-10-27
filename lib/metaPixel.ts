import { MetaStandardEvent } from "@/constants/metaPixel";
import { hasMarketingConsent as hasMarketingConsentCookie } from "@/lib/consent";
import type { MetaStandardEventName } from "@/types/metaPixel";

export function generateEventId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function hasMarketingConsent(): boolean {
  if (typeof window === "undefined") return false;
  return hasMarketingConsentCookie(document.cookie);
}

function isFbqAvailable(): boolean {
  return typeof window !== "undefined" && typeof window.fbq === "function";
}

const META_CUSTOM_DATA_KEYS = new Set([
  "content_ids",
  "content_name",
  "content_type",
  "content_category",
  "num_items",
  "value",
  "currency",
  "order_id",
  "status",
]);

function sendMetaCapiEvent(name: MetaStandardEventName, eventId: string, params: Record<string, unknown>) {
  if (typeof window === "undefined" || !hasMarketingConsent()) return;

  const url = new URL(window.location.href);
  const customData = Object.fromEntries(
    Object.entries(params).filter(([key, value]) =>
      META_CUSTOM_DATA_KEYS.has(key)
      && (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || Array.isArray(value)),
    ),
  );
  const payload = {
    event_name: name,
    event_id: eventId,
    event_source_url: `${url.origin}${url.pathname}`,
    ...(Object.keys(customData).length ? { custom_data: customData } : {}),
    ...(url.searchParams.get("fbclid") ? { fbclid: url.searchParams.get("fbclid") } : {}),
  };

  void fetch("/api/meta-capi", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    keepalive: true,
    body: JSON.stringify(payload),
  }).catch(() => undefined);
}

export function pageview(eventId?: string): string | null {
  return trackEvent(MetaStandardEvent.PageView, {}, eventId);
}

export function trackEvent(
  name: MetaStandardEventName,
  params: Record<string, unknown> = {},
  eventId?: string,
): string | null {
  if (!hasMarketingConsent() || !isFbqAvailable()) return null;
  const id = eventId || generateEventId();
  window.fbq("track", name, params, { eventID: id });
  sendMetaCapiEvent(name, id, params);
  return id;
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
