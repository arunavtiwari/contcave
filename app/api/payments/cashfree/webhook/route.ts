import { NextRequest, NextResponse } from "next/server";
import { handleCashfreeWebhook } from "@/lib/cashfree/webhookService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
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
