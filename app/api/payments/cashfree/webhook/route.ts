import { NextRequest, NextResponse } from "next/server";
import { handleCashfreeWebhook } from "@/lib/cashfree/webhookService";
import { rateLimit, formatRetryAfterMs } from "@/lib/cashfree/rateLimit";
import { createSuccessResponse, handleRouteError } from "@/lib/api-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    try {
        // Lightweight per-IP+path rate limit
        const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
        const key = `cf-webhook:${ip}`;
        const { allowed, resetAt } = rateLimit({ key, limit: 30, windowMs: 60_000 });
        if (!allowed) {
            const retryAfter = formatRetryAfterMs(resetAt);
            return new NextResponse(null, { status: 429, headers: { "Retry-After": retryAfter } });
        }
        let raw = "";
        try {
            raw = await req.text();
        } catch {
            return createSuccessResponse({ ok: true });
        }

        const ts = req.headers.get("x-webhook-timestamp") || req.headers.get("x-cf-signature-timestamp") || "";
        const sig = req.headers.get("x-webhook-signature") || req.headers.get("x-cf-signature") || "";
        const strict = process.env.NODE_ENV === "production";

        const { statusCode } = await handleCashfreeWebhook({
            raw,
            headers: { timestamp: ts, signature: sig, strict },
        });

        return createSuccessResponse({ ok: statusCode === 200 }, statusCode);
    } catch (error) {
        return handleRouteError(error, "POST /api/payments/cashfree/webhook");
    }
}
