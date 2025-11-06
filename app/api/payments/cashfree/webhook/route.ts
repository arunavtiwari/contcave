import { NextRequest, NextResponse } from "next/server";
import { handleCashfreeWebhook } from "@/lib/cashfree/webhookService";
import { rateLimit, formatRetryAfterMs } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    // Lightweight per-IP+path rate limit
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const key = `cf-webhook:${ip}`;
    const result = await rateLimit({ key, limit: 30, windowMs: 60_000 });
    if (!result.allowed) {
        const retryAfter = formatRetryAfterMs(result.resetAt);
        return new NextResponse(null, { status: 429, headers: { "Retry-After": retryAfter } });
    }
    let raw = "";
    try {
        raw = await req.text();
    } catch {
        return NextResponse.json({ ok: true }, { status: 200 });
    }

    const ts = req.headers.get("x-webhook-timestamp") || req.headers.get("x-cf-signature-timestamp") || "";
    const sig = req.headers.get("x-webhook-signature") || req.headers.get("x-cf-signature") || "";
    const strict = process.env.NODE_ENV === "production";

    const { statusCode } = await handleCashfreeWebhook({
        raw,
        headers: { timestamp: ts, signature: sig, strict },
    });

    return NextResponse.json({ ok: statusCode === 200 }, { status: statusCode });
}
