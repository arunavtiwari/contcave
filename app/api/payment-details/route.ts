import { NextRequest } from 'next/server';
import { z } from 'zod';

import getCurrentUser from '@/app/actions/getCurrentUser';
import { createErrorResponse, createSuccessResponse, handleRouteError } from '@/lib/api-utils';
import { PaymentDetailsData, upsertPaymentDetailsSafe } from '@/lib/payment-details';
import { paymentDetailsSchema, paymentDetailsUpdateSchema } from '@/lib/schemas/payment';
import { encryptionService } from '@/lib/security/encryption';

const createSchema = paymentDetailsSchema.extend({
    userId: z.string().min(1, 'User ID is required'),
});

const updateSchema = paymentDetailsUpdateSchema.extend({
    userId: z.string().min(1, 'User ID is required'),
});

export async function POST(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser?.id) {
            return createErrorResponse("Unauthorized", 401);
        }

        const contentType = request.headers.get('content-type') || '';

        if (!contentType.includes('multipart/form-data')) {
            return createErrorResponse('Expected multipart/form-data', 415);
        }

        const form = await request.formData();

        const rawData: Record<string, string> = {};
        form.forEach((val, key) => {
            if (typeof val === 'string') rawData[key] = val.trim();
        });

        if (rawData.userId && rawData.userId !== currentUser.id) {
            return createErrorResponse("You can only update your own payment details", 403);
        }

        rawData.userId = currentUser.id;

        const isUpdate = !rawData.accountNumber?.trim().match(/^\d+$/);
        const schema = isUpdate ? updateSchema : createSchema;

        const validated = schema.parse(rawData);

        const result = await upsertPaymentDetailsSafe({
            userId: currentUser.id,
            accountHolderName: validated.accountHolderName,
            bankName: validated.bankName,
            accountNumber: validated.accountNumber,
            ifscCode: validated.ifscCode,
            companyName: validated.companyName || undefined,
            gstin: validated.gstin || undefined,
        });

        if (!result.success) {
            return createErrorResponse(result.error || 'Failed to save payment details', 500);
        }

        return createSuccessResponse(
            result.data,
            200,
            'Payment details saved successfully'
        );

    } catch (error) {
        if (error instanceof z.ZodError) {
            const msg = error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
            return createErrorResponse(`Validation failed: ${msg}`, 400);
        }

        return handleRouteError(error, "POST /api/payment-details");
    }
}
