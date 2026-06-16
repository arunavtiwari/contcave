const WA_NUMBER = process.env.NEXT_PUBLIC_CONTCAVE_WHATSAPP ?? "";

export function buildWhatsAppUrl(message: string): string {
    const encoded = encodeURIComponent(message.trim());
    return `https://wa.me/${WA_NUMBER}?text=${encoded}`;
}

export function curatedEnquiryMessage(studioName: string, area: string): string {
    return `Hi ContCave, I'm interested in ${studioName} in ${area}. Could you share pricing details and availability?`;
}

export const GENERAL_ENQUIRY_MESSAGE =
    "Hi ContCave, I have a special requirement for a shoot. Could you help me find the right studio?";
