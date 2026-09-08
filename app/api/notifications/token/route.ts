import Ably from "ably";
import { NextRequest, NextResponse } from "next/server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { getAblyApiKey } from "@/lib/ably-server";
import { createErrorResponse, handleRouteError } from "@/lib/api-utils";
import { getClientIp } from "@/lib/http/requestMeta";
import { formatRetryAfterMs, rateLimit } from "@/lib/security/rateLimit";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser?.id) {
            return createErrorResponse("Unauthorized", 401);
        }

        const { allowed, resetAt } = rateLimit({
            key: `ably-notifications:${currentUser.id}:${getClientIp(request.headers)}`,
            limit: 30,
            windowMs: 60_000,
        });
        if (!allowed) {
            return NextResponse.json(
                { success: false, error: "Rate limit exceeded" },
                {
                    status: 429,
                    headers: {
                        "Cache-Control": "no-store",
                        "Retry-After": formatRetryAfterMs(resetAt),
                    },
                }
            );
        }

        const ablyApiKey = getAblyApiKey();
        if (!ablyApiKey) {
            return createErrorResponse("Server configuration error", 500);
        }

        const client = new Ably.Rest({ key: ablyApiKey });

        // Capability for the user's private notification channel
        const capability = JSON.stringify({
            [`notifications:${currentUser.id}`]: ["subscribe"],
        });

        const tokenRequest = await client.auth.createTokenRequest({
            capability,
            clientId: currentUser.id,
            ttl: 4 * 60 * 60 * 1000, // 4 hours
        });

        return NextResponse.json(tokenRequest, {
            headers: {
                "Cache-Control": "no-store, no-cache, must-revalidate",
                Pragma: "no-cache",
                Vary: "Cookie",
            },
        });
    } catch (error) {
        return handleRouteError(error, "POST /api/notifications/token");
    }
}

