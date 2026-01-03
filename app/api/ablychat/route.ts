import Ably from "ably";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.id) {
      return createErrorResponse("Unauthorized", 401);
    }

    const ablyApiKey = process.env.ABLY_API_KEY;
    if (!ablyApiKey || typeof ablyApiKey !== "string") {
      return createErrorResponse("Server configuration error", 500);
    }

    const client = new Ably.Realtime({
      key: ablyApiKey,
    });

    const tokenRequest = await client.auth.createTokenRequest({
      clientId: currentUser.id,
    });

    await client.close();

    return createSuccessResponse(tokenRequest);
  } catch (error) {
    return handleRouteError(error, "POST /api/ablychat");
  }
}
