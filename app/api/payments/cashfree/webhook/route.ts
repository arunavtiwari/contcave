import { NextRequest, NextResponse } from "next/server";

import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";
import { handleCashfreeWebhook } from "@/lib/cashfree/webhookService";
import { getClientIp } from "@/lib/http/requestMeta";
import { formatRetryAfterMs, rateLimit } from "@/lib/security/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    try {
        if (!process.env.CASHFREE_SECRET_KEY) {
            return createErrorResponse("Webhook signature verification is not configured", 503);
        }
        const ip = getClientIp(req.headers);
        const key = `cf-webhook:${ip}`;
        const { allowed, resetAt } = rateLimit({ key, limit: 300, windowMs: 60_000 });
        
        if (!allowed) {
            const retryAfter = formatRetryAfterMs(resetAt);
            return new NextResponse(
                JSON.stringify({ success: false, error: "Rate limit exceeded" }),
                { 
                    status: 429, 
                    headers: { 
                        "Retry-After": retryAfter,
                        "Content-Type": "application/json"
                    } 
                }
            );
        }

        let raw = "";
        try {
            const declaredLength = Number(req.headers.get("content-length") || 0);
            if (Number.isFinite(declaredLength) && declaredLength > 100_000) {
                return createErrorResponse("Request body too large", 413);
            }
            raw = await req.text();
            if (new TextEncoder().encode(raw).byteLength > 100_000) {
                return createErrorResponse("Request body too large", 413);
            }
        } catch (error) {
            if (process.env.NODE_ENV === "development") {
                console.error("[Webhook] Failed to read request body:", error);
            }
            return createErrorResponse("Unable to read webhook body", 500);
        }

        if (!raw || raw.trim().length === 0) {
            return createErrorResponse("Empty request body", 400);
        }

        const ts = req.headers.get("x-webhook-timestamp") || 
                   req.headers.get("x-cf-signature-timestamp") || 
                   "";
        const sig = req.headers.get("x-webhook-signature") || 
                    req.headers.get("x-cf-signature") || 
                    "";
        const skipVerify =
            process.env.CASHFREE_SKIP_WEBHOOK_SIG === "true" &&
            process.env.NODE_ENV !== "production";
        const strict = !skipVerify;

        if (strict && (!ts || !sig)) {
            return createErrorResponse("Missing required webhook headers", 401);
        }

        const { statusCode } = await handleCashfreeWebhook({
            raw,
            headers: { timestamp: ts, signature: sig, strict },
        });

        return statusCode === 200
            ? createSuccessResponse({ ok: true })
            : createErrorResponse(statusCode === 401 ? "Invalid webhook signature" : "Webhook processing failed", statusCode);
    } catch (error) {
        return handleRouteError(error, "POST /api/payments/cashfree/webhook");
    }
}
