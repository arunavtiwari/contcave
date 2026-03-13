import crypto from "crypto";

import { NextResponse } from "next/server";

import { createErrorResponse, handleRouteError } from "@/lib/api-utils";

/* ------------------------------------------------------------------ */
/*  WhatsApp Cloud API Webhook Handler                                 */
/*  Handles:                                                           */
/*    GET  – Verification challenge (hub.verify_token)                 */
/*    POST – Inbound events (message status updates, incoming msgs)    */
/* ------------------------------------------------------------------ */

const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || "";
const APP_SECRET = process.env.WHATSAPP_APP_SECRET || "";

/**
 * Verify the SHA-256 HMAC signature from the X-Hub-Signature-256 header.
 * Enterprise best-practice per Meta docs.
 */
function verifySignature(rawBody: string, signatureHeader: string): boolean {
    if (!APP_SECRET || !signatureHeader) return false;

    const [algo, hash] = signatureHeader.split("=");
    if (algo !== "sha256" || !hash) return false;

    const expected = crypto
        .createHmac("sha256", APP_SECRET)
        .update(rawBody, "utf8")
        .digest("hex");

    // Constant-time comparison to prevent timing attacks
    try {
        return crypto.timingSafeEqual(
            Buffer.from(hash, "hex"),
            Buffer.from(expected, "hex")
        );
    } catch {
        return false;
    }
}

/* ------------------------------------------------------------------ */
/*  GET – Webhook verification challenge                               */
/* ------------------------------------------------------------------ */

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const mode = searchParams.get("hub.mode");
        const token = searchParams.get("hub.verify_token");
        const challenge = searchParams.get("hub.challenge");

        if (mode === "subscribe" && token === VERIFY_TOKEN && challenge) {
            console.warn("[WhatsApp Webhook] Verification successful");
            // Must respond with the challenge value as plain text
            return new NextResponse(challenge, {
                status: 200,
                headers: { "Content-Type": "text/plain" },
            });
        }

        console.warn("[WhatsApp Webhook] Verification failed", { mode, tokenMatch: token === VERIFY_TOKEN });
        return createErrorResponse("Forbidden", 403);
    } catch (error) {
        return handleRouteError(error, "GET /api/whatsapp/webhook");
    }
}

/* ------------------------------------------------------------------ */
/*  POST – Inbound webhook events                                      */
/* ------------------------------------------------------------------ */

type WhatsAppWebhookEntry = {
    id?: string;
    changes?: Array<{
        value?: {
            messaging_product?: string;
            metadata?: { phone_number_id?: string; display_phone_number?: string };
            statuses?: Array<{
                id?: string;
                status?: string; // "sent" | "delivered" | "read" | "failed"
                timestamp?: string;
                recipient_id?: string;
                errors?: Array<{ code?: number; title?: string }>;
            }>;
            messages?: Array<{
                id?: string;
                from?: string;
                timestamp?: string;
                type?: string;
                text?: { body?: string };
            }>;
        };
        field?: string;
    }>;
};

type WhatsAppWebhookPayload = {
    object?: string;
    entry?: WhatsAppWebhookEntry[];
};

export async function POST(request: Request) {
    try {
        const rawBody = await request.text();

        // Signature verification (skip in dev if APP_SECRET not set)
        if (APP_SECRET) {
            const signature = request.headers.get("x-hub-signature-256") || "";
            if (!verifySignature(rawBody, signature)) {
                console.error("[WhatsApp Webhook] Invalid signature");
                return createErrorResponse("Invalid signature", 401);
            }
        }

        let body: WhatsAppWebhookPayload;
        try {
            body = JSON.parse(rawBody);
        } catch {
            return createErrorResponse("Invalid JSON", 400);
        }

        // Must always respond 200 quickly to avoid Meta retries
        // Process asynchronously in production (queue recommended)
        if (body.object === "whatsapp_business_account" && body.entry) {
            for (const entry of body.entry) {
                for (const change of entry.changes || []) {
                    const value = change.value;
                    if (!value) continue;

                    // Handle message status updates (sent, delivered, read, failed)
                    if (value.statuses) {
                        for (const status of value.statuses) {
                            console.warn("[WhatsApp Webhook] Status update", {
                                messageId: status.id,
                                status: status.status,
                                recipientId: status.recipient_id,
                                timestamp: status.timestamp,
                                errors: status.errors,
                            });

                            // TODO: Update DB with delivery status if needed
                            // e.g., mark message as delivered/read in a WhatsApp message log table
                        }
                    }

                    // Handle incoming messages (if you want to support 2-way chat)
                    if (value.messages) {
                        for (const message of value.messages) {
                            console.warn("[WhatsApp Webhook] Incoming message", {
                                messageId: message.id,
                                from: message.from,
                                type: message.type,
                                text: message.text?.body,
                                timestamp: message.timestamp,
                            });

                            // TODO: Forward to support queue or auto-responder
                        }
                    }
                }
            }
        }

        // Always return 200 to acknowledge receipt — Meta retries for 7 days on non-200
        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        // Even on error, return 200 to prevent infinite retry loops from Meta
        console.error("[WhatsApp Webhook] Processing error", {
            error: error instanceof Error ? error.message : String(error),
        });
        return NextResponse.json({ success: true }, { status: 200 });
    }
}
