import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { upsertPaymentDetails, PaymentDetailsData } from '@/lib/payment-details';

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
    taxIdentificationNumber: z.string().min(1).max(50),
    taxResidencyInformation: z.string().min(1).max(200)
});

const updateSchema = createSchema.extend({
    accountNumber: createSchema.shape.accountNumber.optional()
});


// Utility
const createResponse = (success: boolean, data: any, status = 200) =>
    NextResponse.json(
        success
            ? { success, data: data.data || data, message: data.message || 'Success', timestamp: new Date().toISOString() }
            : { success, error: data, timestamp: new Date().toISOString() },
        { status }
    );

const sanitize = (data: any) => ({
    ...data,
    accountNumber: data.accountNumber ? '***' + data.accountNumber.slice(-4) : undefined,
    taxIdentificationNumber: data.taxIdentificationNumber ? '***' + data.taxIdentificationNumber.slice(-4) : undefined,
});

export async function POST(request: NextRequest) {
    const contentType = request.headers.get('content-type') || '';

    if (!contentType.includes('multipart/form-data')) {
        return createResponse(false, 'Expected multipart/form-data', 415);
    }

    try {
        const form = await request.formData();

        const rawData: Record<string, string> = {};
        form.forEach((val, key) => {
            if (typeof val === 'string') rawData[key] = val.trim();
        });

        const isUpdate = !rawData.accountNumber?.trim().match(/^\d+$/);
        const schema = isUpdate ? updateSchema : createSchema;

        const validated = schema.parse(rawData);
        const { accountNumber, ...rest } = validated;

        const paymentDetailsData = {
            ...rest,
            ...(accountNumber ? { accountNumber } : {})
        } as PaymentDetailsData;

        const result = await upsertPaymentDetails(paymentDetailsData);


        return createResponse(true, {
            message: 'Saved successfully',
            data: sanitize(result)
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            const msg = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
            return createResponse(false, `Validation failed: ${msg}`, 400);
        }

        return createResponse(false, 'Unexpected error', 500);
    }
}

export const config = {
    api: {
        bodyParser: false,
        sizeLimit: '1mb',
    },
};
