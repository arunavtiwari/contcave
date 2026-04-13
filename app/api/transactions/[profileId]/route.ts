import { NextRequest } from "next/server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import getTransactions from "@/app/actions/getTransactions";
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ profileId: string }> }
) {
    try {
        const { profileId } = await context.params;

        if (!profileId || typeof profileId !== "string" || profileId.trim().length === 0) {
            return createErrorResponse("Invalid profile ID", 400);
        }

        const currentUser = await getCurrentUser();
        if (!currentUser?.id) {
            return createErrorResponse("Unauthorized", 401);
        }

        if (currentUser.id !== profileId) {
            return createErrorResponse("You can only view your own transactions", 403);
        }

        const transactions = await getTransactions(profileId, {
            ownerView: currentUser.is_owner === true,
        });

        return createSuccessResponse({ transactions });
    } catch (error) {
        return handleRouteError(error, "GET /api/transactions/[profileId]");
    }
}
