import "server-only";

import prisma from "@/lib/prismadb";

/**
 * Hermes WhatsApp — outbound messaging via the open-source connector
 * (scripts/hermes-whatsapp-connector.ts, Baileys under the hood).
 * The Next.js app never talks to WhatsApp directly; it calls the connector's
 * local HTTP API, authenticated with a shared secret.
 *
 * Env: HERMES_WA_CONNECTOR_URL (default http://127.0.0.1:8790),
 *      HERMES_WA_SHARED_SECRET (must match the connector).
 */

const CONNECTOR_URL = process.env.HERMES_WA_CONNECTOR_URL ?? "http://127.0.0.1:8790";

export function normalizePhone(phone: string): string {
    return phone.replace(/\D/g, "");
}

export async function sendWhatsAppText(toPhone: string, text: string): Promise<void> {
    const secret = process.env.HERMES_WA_SHARED_SECRET;
    if (!secret) throw new Error("HERMES_WA_SHARED_SECRET is not set");

    const to = normalizePhone(toPhone);
    const res = await fetch(`${CONNECTOR_URL}/send`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-hermes-secret": secret,
        },
        body: JSON.stringify({ to, text }),
    });
    if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`WhatsApp connector send failed (${res.status}): ${body.slice(0, 200)}`);
    }
}

/** Send + log against the brand's communication history. */
export async function sendAndLogWhatsApp(params: {
    toPhone: string;
    text: string;
    brandId?: string;
    briefId?: string;
}): Promise<void> {
    await sendWhatsAppText(params.toPhone, params.text);
    await prisma.whatsAppMessage.create({
        data: {
            direction: "OUTBOUND",
            waNumber: normalizePhone(params.toPhone),
            text: params.text,
            mediaUrls: [],
            brandId: params.brandId,
            briefId: params.briefId,
        },
    });
}
