import { NextRequest } from 'next/server';
import { z } from 'zod';
import getCurrentUser from '@/app/actions/getCurrentUser';
import { upsertPaymentDetails, PaymentDetailsData } from '@/lib/payment-details';
import { createErrorResponse, createSuccessResponse, handleRouteError } from '@/lib/api-utils';

const createSchema = z.object({
    userId: z.string().min(1, 'User ID is required'),
    accountHolderName: z.string()
        .min(2, 'Account holder name must be at least 2 characters')
        .max(100, 'Too long')
        .regex(/^[a-zA-Z\s.'-]+$/, 'Invalid characters'),
    bankName: z.string().min(1, 'Bank name is required').max(100),
    accountNumber: z.string()
        .min(9, 'Too short')
        .max(20, 'Too long')
        .regex(/^\d+$/, 'Must contain only digits'),
    ifscCode: z.string()
        .length(11, 'Must be exactly 11 characters')
        .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC format'),
    companyName: z.string().max(100).optional(),
    gstin: z.string().max(15).regex(/^[0-9A-Z]{15}$/i, 'Invalid GSTIN').optional()
});

const updateSchema = createSchema.extend({
    accountNumber: createSchema.shape.accountNumber.optional()
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
        const { accountNumber, ...rest } = validated;

        const paymentDetailsData = {
            ...rest,
            ...(accountNumber ? { accountNumber } : {})
        } as PaymentDetailsData;

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
