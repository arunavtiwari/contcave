import { NextRequest } from 'next/server';
import { z } from 'zod';

import getCurrentUser from '@/app/actions/getCurrentUser';
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";
import { getPaymentDetailsSafe } from '@/lib/payment-details';
import { userIdSchema } from '@/schemas/common';

interface RouteParams {
    params: Promise<{ userId: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser?.id) {
            return createErrorResponse("Unauthorized", 401);
        }

        const resolvedParams = await params;
        const rawUserId = resolvedParams.userId;

        const userId = userIdSchema.parse(rawUserId);

        if (userId !== currentUser.id) {
            return createErrorResponse("You can only view your own payment details", 403);
        }

        const result = await getPaymentDetailsSafe(userId);

        if (!result.success) {
            return createErrorResponse(result.error || "Payment details not found", 404);
        }

        if (!result.data) {
            return createErrorResponse("Payment details not found", 404);
        }

        return createSuccessResponse(result.data);

    } catch (error) {
        if (error instanceof z.ZodError) {
            const errorMessage = error.issues[0]?.message || 'Invalid user ID';
            return createErrorResponse(errorMessage, 400);
        }

        return handleRouteError(error, `GET /api/payment-details/[userId]`);
    }
}
