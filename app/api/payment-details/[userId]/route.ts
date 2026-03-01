import { NextRequest } from 'next/server';
import { z } from 'zod';

import getCurrentUser from '@/app/actions/getCurrentUser';
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";
import { getPaymentDetailsByUserId } from '@/lib/payment-details';
import { userIdSchema } from '@/lib/schemas/common';
import { encryptionService } from '@/lib/security/encryption';

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

        const paymentDetails = await getPaymentDetailsByUserId(userId);

        if (!paymentDetails) {
            return createErrorResponse("Payment details not found", 404);
        }

        let accountNumber = paymentDetails.accountNumber;
        if (paymentDetails.accountNumberIV) {
            try {
                accountNumber = encryptionService.decrypt({
                    encrypted: paymentDetails.accountNumber,
                    iv: paymentDetails.accountNumberIV
                });
            } catch (error) {
                console.error('Failed to decrypt account number:', error);
            }
        }

        let gstin = paymentDetails.gstin;
        if (paymentDetails.gstin && paymentDetails.gstinIV) {
            try {
                gstin = encryptionService.decrypt({
                    encrypted: paymentDetails.gstin,
                    iv: paymentDetails.gstinIV
                });
            } catch (error) {
                console.error('Failed to decrypt GSTIN:', error);
            }
        }

        let ifscCode = paymentDetails.ifscCode;
        if (paymentDetails.ifscCode && paymentDetails.ifscCodeIV) {
            try {
                ifscCode = encryptionService.decrypt({
                    encrypted: paymentDetails.ifscCode,
                    iv: paymentDetails.ifscCodeIV
                });
            } catch (error) {
                console.error('Failed to decrypt IFSC Code:', error);
            }
        }

        const sanitizedData = sanitizePaymentDetails({
            ...paymentDetails,
            accountNumber,
            ifscCode,
            gstin: gstin || undefined
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
