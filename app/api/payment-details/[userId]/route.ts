import { NextRequest, NextResponse } from 'next/server';
import { getPaymentDetailsByUserId } from '@/lib/payment-details';
import { z } from 'zod';

const userIdSchema = z.string().min(1, 'User ID cannot be empty').trim();

const createResponse = (success: boolean, data: any, status = 200) => {
    return NextResponse.json({
        success,
        ...(success ? { data } : { error: data }),
        timestamp: new Date().toISOString()
    }, { status });
};

const sanitizePaymentDetails = (paymentDetails: any) => ({
    ...paymentDetails,
    accountNumber: paymentDetails.accountNumber
        ? '***' + paymentDetails.accountNumber.slice(-4)
        : undefined,
    taxIdentificationNumber: paymentDetails.taxIdentificationNumber
        ? '***' + paymentDetails.taxIdentificationNumber.slice(-4)
        : undefined,
});

const logRequest = (userId: string, success: boolean, processingTime: number) => {
    const logLevel = success ? 'info' : 'error';
    console[logLevel](`GET /api/payment-details/${userId} - ${success ? 'Success' : 'Failed'} (${processingTime}ms)`);
};

interface RouteParams {
    params: Promise<{ userId: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
    const startTime = Date.now();
    let userId: string | undefined;

    try {
        const resolvedParams = await params;
        const rawUserId = resolvedParams.userId;

        userId = userIdSchema.parse(rawUserId);

        const paymentDetails = await getPaymentDetailsByUserId(userId);

        if (!paymentDetails) {
            logRequest(userId, false, Date.now() - startTime);
            return createResponse(false, 'Payment details not found', 404);
        }

        const sanitizedData = sanitizePaymentDetails(paymentDetails);

        logRequest(userId, true, Date.now() - startTime);
        return createResponse(true, sanitizedData);

    } catch (error) {
        const processingTime = Date.now() - startTime;

        if (error instanceof z.ZodError) {
            const errorMessage = error.errors[0]?.message || 'Invalid user ID';
            console.warn(`GET /api/payment-details - Validation error: ${errorMessage} (${processingTime}ms)`);
            return createResponse(false, errorMessage, 400);
        }

        if (error instanceof Error) {
            console.error(`GET /api/payment-details${userId ? `/${userId}` : ''} - Database error (${processingTime}ms):`, {
                message: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
                userId: userId || 'unknown'
            });

            if (error.message.includes('connection') || error.message.includes('timeout')) {
                return createResponse(false, 'Service temporarily unavailable', 503);
            }
        }

        console.error(`GET /api/payment-details${userId ? `/${userId}` : ''} - Unexpected error (${processingTime}ms):`, error);

        const errorMessage = process.env.NODE_ENV === 'development'
            ? `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`
            : 'Internal server error';

        return createResponse(false, errorMessage, 500);
    }
}

export const config = {
    runtime: 'nodejs',
};