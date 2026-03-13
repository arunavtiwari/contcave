/**
 * Client-side WhatsApp support link utility.
 * Centralises the wa.me URL generation used in BookingCard and BookingClient.
 */
export function buildWhatsAppSupportUrl(message: string): string {
    const raw = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "";
    const num = raw.replace(/[^0-9]/g, "");
    const encoded = encodeURIComponent(message);

    // If the number doesn't start with a country code and is 10 digits, prepend 91 (India)
    const normalised =
        num.length === 10 ? `91${num}` : num;

    return normalised
        ? `https://wa.me/${normalised}?text=${encoded}`
        : `https://wa.me/?text=${encoded}`;
}

/**
 * Open a WhatsApp support chat in a new tab.
 * Safe to call on the server (no-ops if window is undefined).
 */
export function openWhatsAppSupport(message: string): void {
    if (typeof window === "undefined") return;
    window.open(buildWhatsAppSupportUrl(message), "_blank", "noopener,noreferrer");
}
