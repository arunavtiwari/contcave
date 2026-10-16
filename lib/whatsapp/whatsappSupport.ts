import { buildWhatsAppUrl } from "./urls";

/**
 * Client-side WhatsApp support link utility.
 * Centralises the wa.me URL generation used in BookingCard and BookingClient.
 */
export function buildWhatsAppSupportUrl(message: string): string {
    return buildWhatsAppUrl(message);
}

/**
 * Open a WhatsApp support chat in a new tab.
 * Safe to call on the server (no-ops if window is undefined).
 */
export function openWhatsAppSupport(message: string): void {
    if (typeof window === "undefined") return;
    window.open(buildWhatsAppSupportUrl(message), "_blank", "noopener,noreferrer");
}
