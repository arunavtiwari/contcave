import { NextRequest, NextResponse } from "next/server";
import { handleCashfreeWebhook } from "@/lib/cashfree/webhookService";
import { rateLimit, formatRetryAfterMs } from "@/lib/cashfree/rateLimit";
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    try {
        const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                   req.headers.get("x-real-ip") || 
                   "unknown";
        const key = `cf-webhook:${ip}`;
        const { allowed, resetAt } = rateLimit({ key, limit: 30, windowMs: 60_000 });
        
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
            raw = await req.text();
            if (raw.length > 100000) {
                return createErrorResponse("Request body too large", 413);
            }
        } catch (error) {
            if (process.env.NODE_ENV === "development") {
                console.error("[Webhook] Failed to read request body:", error);
            }
            return createSuccessResponse({ ok: true }, 200);
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
        const strict = process.env.NODE_ENV === "production";

        if (strict && (!ts || !sig)) {
            return createErrorResponse("Missing required webhook headers", 400);
        }

        const { statusCode } = await handleCashfreeWebhook({
            raw,
            headers: { timestamp: ts, signature: sig, strict },
        });

        return createSuccessResponse({ ok: statusCode === 200 }, statusCode);
    } catch (error) {
        return handleRouteError(error, "POST /api/payments/cashfree/webhook");
    }
}
