import { NextRequest } from 'next/server';
import { getPaymentDetailsByUserId } from '@/lib/payment-details';
import { z } from 'zod';
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";

const userIdSchema = z.string().min(1, 'User ID cannot be empty').trim();

const maskGstin = (value: string) =>
    value.length <= 8 ? value : value.replace(/^(.{4}).+(.{4})$/, '$1******$2');

const sanitizePaymentDetails = (paymentDetails: { accountNumber?: string; gstin?: string;[key: string]: unknown }) => ({
    ...paymentDetails,
    accountNumber: paymentDetails.accountNumber
        ? '***' + paymentDetails.accountNumber.slice(-4)
        : undefined,
    gstin: paymentDetails.gstin
        ? maskGstin(paymentDetails.gstin)
        : undefined,
});

interface RouteParams {
    params: Promise<{ userId: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
    try {
        const resolvedParams = await params;
        const rawUserId = resolvedParams.userId;

        const userId = userIdSchema.parse(rawUserId);

        const paymentDetails = await getPaymentDetailsByUserId(userId);

        if (!paymentDetails) {
            return createErrorResponse("Payment details not found", 404);
        }

        const sanitizedData = sanitizePaymentDetails({
            ...paymentDetails,
            gstin: paymentDetails.gstin || undefined
        });

        return createSuccessResponse(sanitizedData);

    } catch (error) {
        if (error instanceof z.ZodError) {
            const errorMessage = error.issues[0]?.message || 'Invalid user ID';
            return createErrorResponse(errorMessage, 400);
        }

        return handleRouteError(error, `GET /api/payment-details/[userId]`);
    }
}
