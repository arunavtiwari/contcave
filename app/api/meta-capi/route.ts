import { NextResponse, type NextRequest } from "next/server";

import { META_PIXEL_ID } from "@/constants/metaPixel";
import {
    buildFbc,
    extractFbp,
    sendServerEvent,
    sha256,
} from "@/lib/metaPixel";
import type { CAPIEventPayload } from "@/types/metaPixel";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const {
            event_name,
            event_id,
            event_source_url,
            custom_data,
            user_email,
            user_phone,
            user_id,
            fbclid,
        } = body as {
            event_name: string;
            event_id: string;
            event_source_url?: string;
            custom_data?: Record<string, unknown>;
            user_email?: string;
            user_phone?: string;
            user_id?: string;
            fbclid?: string;
        };

        if (!event_name || !event_id) {
            return NextResponse.json(
                { error: "event_name and event_id are required" },
                { status: 400 },
            );
        }

        const cookieHeader = request.headers.get("cookie") ?? "";
        const payload: CAPIEventPayload = {
            event_name,
            event_time: Math.floor(Date.now() / 1000),
            event_id,
            event_source_url,
            action_source: "website",
            user_data: {
                client_ip_address:
                    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
                    request.headers.get("x-real-ip") ??
                    undefined,
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
