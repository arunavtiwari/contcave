import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { MetaStandardEvent } from "@/constants/metaPixel";
import { hasMarketingConsent } from "@/lib/consent";
import { getClientIp } from "@/lib/http/requestMeta";
import {
    buildFbc,
    extractFbp,
    sendServerEvent,
    sha256,
} from "@/lib/metaPixel.server";
import { formatRetryAfterMs, rateLimit } from "@/lib/security/rateLimit";
import { getValidatedBaseUrl } from "@/lib/utils";
import type { CAPIEventPayload } from "@/types/metaPixel";

const eventSchema = z.object({
    event_name: z.enum(Object.values(MetaStandardEvent) as [string, ...string[]]),
    event_id: z.string().trim().min(8).max(100).regex(/^[A-Za-z0-9._:-]+$/),
    event_source_url: z.string().url().max(1000).optional(),
    custom_data: z.record(z.string(), z.unknown()).refine((value) => {
        try { return JSON.stringify(value).length <= 10_000; } catch { return false; }
    }, "custom_data is too large").optional(),
    user_email: z.string().trim().email().max(255).optional(),
    user_phone: z.string().trim().regex(/^\+?\d{8,15}$/).optional(),
    user_id: z.string().trim().min(1).max(100).optional(),
    fbclid: z.string().trim().max(500).regex(/^[A-Za-z0-9._-]+$/).optional(),
});

export async function POST(request: NextRequest) {
    try {
        if (!request.headers.get("content-type")?.includes("application/json")) {
            return NextResponse.json({ error: "Content-Type must be application/json" }, { status: 415 });
        }
        const configuredOrigin = getValidatedBaseUrl();
        const requestOrigin = request.headers.get("origin");
        if (process.env.NODE_ENV === "production" && requestOrigin !== configuredOrigin) {
            return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
        }
        if (!hasMarketingConsent(request.headers.get("cookie") || "")) {
            return NextResponse.json({ error: "Marketing consent is required" }, { status: 403 });
        }
        const limit = rateLimit({
            key: `meta-capi:${getClientIp(request.headers)}`,
            limit: 30,
            windowMs: 60_000,
        });
        if (!limit.allowed) {
            const response = NextResponse.json({ error: "Too many requests" }, { status: 429 });
            response.headers.set("Retry-After", formatRetryAfterMs(limit.resetAt));
            return response;
        }

        const rawBody = await request.text();
        if (new TextEncoder().encode(rawBody).byteLength > 25_000) {
            return NextResponse.json({ error: "Request body too large" }, { status: 413 });
        }
        let body: unknown;
        try { body = JSON.parse(rawBody); } catch {
            return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
        }
        const parsed = eventSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
        }
        const {
            event_name, event_id, event_source_url, custom_data,
            user_email, user_phone, user_id, fbclid,
        } = parsed.data;
        if (event_source_url && new URL(event_source_url).origin !== configuredOrigin) {
            return NextResponse.json({ error: "Invalid event source URL" }, { status: 400 });
        }

        const cookieHeader = request.headers.get("cookie") ?? "";
        const payload: CAPIEventPayload = {
            event_name,
            event_time: Math.floor(Date.now() / 1000),
            event_id,
            event_source_url,
            action_source: "website",
            user_data: {
                client_ip_address: getClientIp(request.headers),
                client_user_agent: request.headers.get("user-agent") ?? undefined,
                fbp: extractFbp(cookieHeader),
                fbc: buildFbc(fbclid),
                ...(user_email ? { em: sha256(user_email) } : {}),
                ...(user_phone ? { ph: sha256(user_phone) } : {}),
                ...(user_id ? { external_id: sha256(user_id) } : {}),
            },
            custom_data,
        };

        const result = await sendServerEvent(payload);

        if (!result) {
            return NextResponse.json(
                { error: "Failed to send event to Meta CAPI" },
                { status: 502 },
            );
        }

        return NextResponse.json({
            success: true,
            events_received: result.events_received,
        });
    } catch (err) {
        console.error("[Meta CAPI Route] Error:", err);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}
