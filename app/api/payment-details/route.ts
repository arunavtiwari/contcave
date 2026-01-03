import { NextRequest } from 'next/server';
import { z } from 'zod';

import getCurrentUser from '@/app/actions/getCurrentUser';
import { createErrorResponse, createSuccessResponse, handleRouteError } from '@/lib/api-utils';
import { PaymentDetailsData,upsertPaymentDetails } from '@/lib/payment-details';
import { paymentDetailsSchema, paymentDetailsUpdateSchema } from '@/lib/schemas/payment';
import { encryptionService } from '@/lib/security/encryption';

const createSchema = paymentDetailsSchema.extend({
    userId: z.string().min(1, 'User ID is required'),
});

const updateSchema = paymentDetailsUpdateSchema.extend({
    userId: z.string().min(1, 'User ID is required'),
});

const maskGstin = (value: string) =>
    value.length <= 8 ? value : value.replace(/^(.{4}).+(.{4})$/, '$1******$2');

const sanitize = (data: { accountNumber?: string | null; gstin?: string | null;[key: string]: unknown }) => ({
    ...data,
    accountNumber: data.accountNumber ? '***' + data.accountNumber.slice(-4) : undefined,
    gstin: data.gstin ? maskGstin(data.gstin) : undefined,
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
        const { accountNumber, ifscCode, gstin, ...rest } = validated;

        let encryptedAccountNumber = undefined;
        let accountNumberIV = undefined;
        if (accountNumber) {
            const result = encryptionService.encrypt(accountNumber);
            encryptedAccountNumber = result.encrypted;
            accountNumberIV = result.iv;
        }

        const encryptedIfscCode = encryptionService.encrypt(ifscCode.toUpperCase());

        let encryptedGstin = undefined;
        let gstinIV = undefined;
        if (gstin) {
            const result = encryptionService.encrypt(gstin.toUpperCase());
            encryptedGstin = result.encrypted;
            gstinIV = result.iv;
        }

        const paymentDetailsData: PaymentDetailsData = {
            ...rest,
            userId: currentUser.id,
            ifscCode: encryptedIfscCode.encrypted,
            ifscCodeIV: encryptedIfscCode.iv,
            companyName: rest.companyName || undefined,
            ...(encryptedAccountNumber ? {
                accountNumber: encryptedAccountNumber,
                accountNumberIV: accountNumberIV
            } : {}),
            ...(encryptedGstin ? {
                gstin: encryptedGstin,
                gstinIV: gstinIV
            } : {}),
            encryptionVersion: encryptionService.getKeyVersion(),
        };

        const result = await upsertPaymentDetails(paymentDetailsData);

        return createSuccessResponse(
            sanitize(result),
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
