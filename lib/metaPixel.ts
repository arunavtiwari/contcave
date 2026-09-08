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
