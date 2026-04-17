import { NextRequest } from 'next/server';
import { z } from 'zod';

import getCurrentUser from '@/app/actions/getCurrentUser';
import { createErrorResponse, createSuccessResponse, handleRouteError } from '@/lib/api-utils';
import { cfUpdateVendor } from '@/lib/cashfree/cashfree';
import { upsertPaymentDetailsSafe } from '@/lib/payment-details';
import prisma from '@/lib/prismadb';
import { encryptionService } from '@/lib/security/encryption';
import { paymentDetailsSchema, paymentDetailsUpdateSchema } from '@/schemas/payment';

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

        // Sync changes to Cashfree vendor (best-effort, don't fail the save)
        try {
            const paymentRecord = await prisma.paymentDetails.findUnique({
                where: { userId: currentUser.id },
                select: {
                    cashfreeVendorId: true,
                    vendorIdIV: true,
                    accountNumber: true,
                    accountNumberIV: true,
                    ifscCode: true,
                    ifscCodeIV: true,
                    gstin: true,
                    gstinIV: true,
                    accountHolderName: true,
                },
            });

            if (paymentRecord?.cashfreeVendorId && paymentRecord?.vendorIdIV) {
                const decryptedVendorId = encryptionService.decrypt({
                    encrypted: paymentRecord.cashfreeVendorId,
                    iv: paymentRecord.vendorIdIV,
                });

                // Build update payload with only the fields that were submitted
                const updatePayload: Parameters<typeof cfUpdateVendor>[1] = {};

                // Sync bank details if any bank field was submitted
                // Cashfree requires ALL three fields together, so fill missing ones from DB
                if (validated.accountNumber || validated.ifscCode || validated.accountHolderName) {
                    // Decrypt existing values as fallbacks
                    const existingAccNum = paymentRecord.accountNumber && paymentRecord.accountNumberIV
                        ? encryptionService.decrypt({ encrypted: paymentRecord.accountNumber, iv: paymentRecord.accountNumberIV })
                        : undefined;
                    const existingIfsc = paymentRecord.ifscCode && paymentRecord.ifscCodeIV
                        ? encryptionService.decrypt({ encrypted: paymentRecord.ifscCode, iv: paymentRecord.ifscCodeIV })
                        : undefined;
                    const existingHolder = paymentRecord.accountHolderName || undefined;

                    const accountHolder = validated.accountHolderName || existingHolder;
                    const accountNumber = validated.accountNumber || existingAccNum;
                    const ifsc = (validated.ifscCode || existingIfsc)?.toUpperCase();

                    // Only send bank if we have all three required fields
                    if (accountHolder && accountNumber && ifsc) {
                        updatePayload.bank = {
                            account_holder: accountHolder,
                            account_number: accountNumber,
                            ifsc,
                        };
                    }
                }

                if (validated.gstin !== undefined) {
                    updatePayload.kyc_details = {
                        account_type: "BUSINESS",
                        business_type: "B2B",
                        ...(validated.gstin ? { gst: validated.gstin.toUpperCase() } : {}),
                    };
                }

                if (Object.keys(updatePayload).length > 0) {
                    await cfUpdateVendor(decryptedVendorId, updatePayload);
                }

            }
        } catch (syncError) {
            console.error('[PaymentDetails] Cashfree vendor sync failed (non-blocking):', syncError);
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
