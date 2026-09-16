export function getNormalizedWhatsAppNumber(): string {
    const raw = (process.env.NEXT_PUBLIC_CONTCAVE_WHATSAPP || process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "").replace(/\D/g, "");
    if (!raw) return "";
    return raw.length === 10 ? `91${raw}` : raw;
}

export function buildWhatsAppUrl(message?: string): string {
    const num = getNormalizedWhatsAppNumber();
    const encoded = message ? encodeURIComponent(message.trim()) : "";
    if (!num) return encoded ? `https://wa.me/?text=${encoded}` : "https://wa.me/";
    return encoded ? `https://wa.me/${num}?text=${encoded}` : `https://wa.me/${num}`;
}

export function curatedEnquiryMessage(studioName: string, area: string): string {
    return `Hi ContCave, I'm interested in ${studioName} in ${area}. Could you share pricing details and availability?`;
}

export const GENERAL_ENQUIRY_MESSAGE =
    "Hi ContCave, I have a special requirement for a shoot. Could you help me find the right studio?";
