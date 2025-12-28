import Ably from "ably";
import getCurrentUser from "@/app/actions/getCurrentUser";
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return createErrorResponse("Unauthorized", 401);
    }

    const client = new Ably.Realtime({
      key: process.env.ABLY_API_KEY || "mqScEw.KR_mtA:hXN4SyJS62x5aW_oF3ZUL5QpkxzgpYltXFl1jmtJfMc",
    });

    const tokenRequest = await client.auth.createTokenRequest({
      clientId: currentUser.id,
    });

    return createSuccessResponse(tokenRequest);
  } catch (error) {
    return handleRouteError(error, "POST /api/ablychat");
  }
}
