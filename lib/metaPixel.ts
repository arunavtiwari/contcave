import { META_PIXEL_ID, MetaStandardEvent } from "@/constants/metaPixel";
import { hasMarketingConsent as hasMarketingConsentCookie } from "@/lib/consent";
import type { MetaStandardEventName } from "@/types/metaPixel";

export function generateEventId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function canTrack(): boolean {
  return typeof window !== "undefined" && !!META_PIXEL_ID && hasMarketingConsentCookie(document.cookie);
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
  "search_string",
]);

function sendMetaCapiEvent(
  name: MetaStandardEventName,
  eventId: string,
  params: Record<string, unknown>,
  eventSourcePath?: string,
) {
  const url = new URL(window.location.href);
  const sourcePath =
    eventSourcePath?.startsWith("/") && !eventSourcePath.startsWith("//")
      ? eventSourcePath.split(/[?#]/, 1)[0] || "/"
      : url.pathname;
  const customData = Object.fromEntries(
    Object.entries(params).filter(([key, value]) =>
      META_CUSTOM_DATA_KEYS.has(key)
      && (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || Array.isArray(value)),
    ),
  );
  const payload = {
    event_name: name,
    event_id: eventId,
    event_source_url: `${url.origin}${sourcePath}`,
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

/*
 * The Pixel script loads after hydration, but events such as Purchase and ViewContent fire as
 * the page mounts. Browser events raised before the Pixel is ready wait here and are sent, in
 * order, as soon as MetaPixelScript announces it.
 */
type PendingPixelEvent = { name: MetaStandardEventName; params: Record<string, unknown>; eventId: string };
const MAX_PENDING_PIXEL_EVENTS = 25;
const pendingPixelEvents: PendingPixelEvent[] = [];
let waitingForPixel = false;

function isPixelReady(): boolean {
  return window.__CC_META_PIXEL_READY__ === true && typeof window.fbq === "function";
}

function flushPendingPixelEvents() {
  waitingForPixel = false;
  const events = pendingPixelEvents.splice(0);
  if (!canTrack() || !isPixelReady()) return;
  for (const event of events) {
    window.fbq("track", event.name, event.params, { eventID: event.eventId });
  }
}

function sendPixelEvent(name: MetaStandardEventName, params: Record<string, unknown>, eventId: string) {
  if (isPixelReady()) {
    window.fbq("track", name, params, { eventID: eventId });
    return;
  }
  if (pendingPixelEvents.length < MAX_PENDING_PIXEL_EVENTS) {
    pendingPixelEvents.push({ name, params, eventId });
  }
  if (!waitingForPixel) {
    waitingForPixel = true;
    window.addEventListener("cc-meta-pixel-ready", flushPendingPixelEvents, { once: true });
  }
}

export function pageview(eventId?: string, eventSourcePath?: string): string | null {
  return trackEvent(MetaStandardEvent.PageView, {}, eventId, eventSourcePath);
}

/** Send an event through the browser Pixel and the Conversions API under one shared event ID. */
export function trackEvent(
  name: MetaStandardEventName,
  params: Record<string, unknown> = {},
  eventId?: string,
  eventSourcePath?: string,
): string | null {
  if (!canTrack()) return null;
  const id = eventId || generateEventId();
  sendPixelEvent(name, params, id);
  sendMetaCapiEvent(name, id, params, eventSourcePath);
  return id;
}

/** Send only the server copy when a GTM Pixel tag owns the browser event. */
export function trackServerEvent(
  name: MetaStandardEventName,
  params: Record<string, unknown> = {},
  eventId?: string,
  eventSourcePath?: string,
): string | null {
  if (!canTrack()) return null;
  const id = eventId || generateEventId();
  sendMetaCapiEvent(name, id, params, eventSourcePath);
  return id;
}
