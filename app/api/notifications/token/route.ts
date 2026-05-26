import Ably from "ably";
import { NextRequest, NextResponse } from "next/server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { createErrorResponse, handleRouteError } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

export async function POST(_request: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser?.id) {
            return createErrorResponse("Unauthorized", 401);
        }

        const ablyApiKey = process.env.ABLY_CHAT_API;
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

        return NextResponse.json(tokenRequest);
    } catch (error) {
        return handleRouteError(error, "POST /api/notifications/token");
    }
}
