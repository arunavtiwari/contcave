import crypto from "crypto";
import { NextRequest } from "next/server";

import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";
import { normalizePhone } from "@/lib/hermes/whatsapp";
import prisma from "@/lib/prismadb";

/**
 * Hermes WhatsApp inbound bridge.
 * The open-source connector (scripts/hermes-whatsapp-connector.ts) POSTs every
 * inbound message here. Messages are logged and matched to a ClientBrand by
 * phone so producers see brand communication next to briefs.
 * Phase 1 adds LLM parsing of inbound messages into Briefs.
 */

function secretsMatch(a: string, b: string): boolean {
    const ha = crypto.createHash("sha256").update(a).digest();
    const hb = crypto.createHash("sha256").update(b).digest();
    return crypto.timingSafeEqual(ha, hb);
}

export async function POST(request: NextRequest) {
    try {
        const secret = process.env.HERMES_WA_SHARED_SECRET;
        const provided = request.headers.get("x-hermes-secret") ?? "";
        if (!secret || !secretsMatch(provided, secret)) {
            return createErrorResponse("Forbidden", 403);
        }

        const body = await request.json();
        const from = typeof body.from === "string" ? normalizePhone(body.from) : "";
        const text = typeof body.text === "string" ? body.text : undefined;
        const mediaUrls = Array.isArray(body.mediaUrls)
            ? body.mediaUrls.filter((u: unknown) => typeof u === "string")
            : [];
        if (!from || (!text && mediaUrls.length === 0)) {
            return createErrorResponse("Missing from/text", 400);
        }

        // Match brand by phone digits (contact.phone stored free-form)
        const brands = await prisma.clientBrand.findMany({
            where: { contact: { isSet: true } },
            select: { id: true, contact: true },
        });
        const brand = brands.find(
            (b) => b.contact?.phone && from.endsWith(normalizePhone(b.contact.phone).slice(-10))
        );

        const message = await prisma.whatsAppMessage.create({
            data: {
                direction: "INBOUND",
                waNumber: from,
                text,
                mediaUrls,
                brandId: brand?.id,
            },
        });

        // TODO(Phase 1): parse structured briefs out of inbound messages
        // (lib/hermes/agent/fingerprint.ts + utility-tier classification).

        return createSuccessResponse({ id: message.id, matchedBrand: Boolean(brand) });
    } catch (error) {
        return handleRouteError(error, "POST /api/hermes/whatsapp/inbound");
    }
}
