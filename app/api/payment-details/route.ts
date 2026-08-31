import { NextRequest } from 'next/server';
import { z } from 'zod';

import getCurrentUser from '@/app/actions/getCurrentUser';
import { createErrorResponse, createSuccessResponse, handleRouteError } from '@/lib/api-utils';
import { CashfreeVendorNotFoundError, cfEnsureVendor, cfUpdateVendor } from '@/lib/cashfree/cashfree';
import { decryptPaymentDetailsInternal, upsertPaymentDetailsSafe } from '@/lib/payment-details';
import prisma from '@/lib/prismadb';
import { encryptionService } from '@/lib/security/encryption';
import { isOwner } from '@/lib/user/permissions';
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
        if (!isOwner(currentUser.role)) {
            return createErrorResponse("Only owners can manage payment details", 403);
        }

        const contentType = request.headers.get('content-type') || '';

        if (!contentType.includes('multipart/form-data')) {
            return createErrorResponse('Expected multipart/form-data', 415);
        }
        const contentLength = Number(request.headers.get('content-length') || 0);
        if (Number.isFinite(contentLength) && contentLength > 50_000) {
            return createErrorResponse('Request body too large', 413);
        }

        const form = await request.formData();
        if (Array.from(form.keys()).length > 20 || Array.from(form.values()).some(value => typeof value !== 'string')) {
            return createErrorResponse('Invalid payment details form', 400);
        }

        const rawData: Record<string, string> = {};
        form.forEach((val, key) => {
            if (typeof val === 'string') rawData[key] = val.trim();
        });

        if (rawData.userId && rawData.userId !== currentUser.id) {
            return createErrorResponse("You can only update your own payment details", 403);
        }

        rawData.userId = currentUser.id;

        const existingDetails = await prisma.paymentDetails.findUnique({
            where: { userId: currentUser.id },
            select: { id: true },
        });
        const schema = existingDetails ? updateSchema : createSchema;

        const validated = schema.parse(rawData);

        const result = await upsertPaymentDetailsSafe({
            userId: currentUser.id,
            accountHolderName: validated.accountHolderName,
            bankName: validated.bankName,
            accountNumber: validated.accountNumber,
            ifscCode: validated.ifscCode,
            companyName: validated.companyName === '' ? null : validated.companyName || undefined,
            gstin: validated.gstin === '' ? null : validated.gstin || undefined,
        });

        if (!result.success) {
            return createErrorResponse(result.error || 'Failed to save payment details', 500);
        }

        let vendorSyncFailed = false;
        try {
            const paymentRecord = await prisma.paymentDetails.findUnique({
                where: { userId: currentUser.id },
            });
            const decryptedPaymentRecord = paymentRecord
                ? decryptPaymentDetailsInternal(paymentRecord)
                : null;

            const payoutVerificationComplete = Boolean(
                currentUser.email_verified
                && currentUser.phone_verified
                && currentUser.aadhaar_verified
                && currentUser.bank_verified
                && currentUser.email
                && currentUser.phone
            );

            if (!payoutVerificationComplete) {
                return createSuccessResponse(
                    result.data,
                    200,
                    'Payment details saved. Complete identity and bank verification before Cashfree payout onboarding.'
                );
            }

            if (decryptedPaymentRecord?.cashfreeVendorId) {
                const decryptedVendorId = decryptedPaymentRecord.cashfreeVendorId;

                // Build update payload with only the fields that were submitted
                const updatePayload: Parameters<typeof cfUpdateVendor>[1] = {};

                // Sync bank details if any bank field was submitted
                // Cashfree requires ALL three fields together, so fill missing ones from DB
                if (validated.accountNumber || validated.ifscCode || validated.accountHolderName) {
                    // Decrypt existing values as fallbacks
                    const existingAccNum = decryptedPaymentRecord.accountNumber || undefined;
                    const existingIfsc = decryptedPaymentRecord.ifscCode || undefined;
                    const existingHolder = decryptedPaymentRecord.accountHolderName || undefined;

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
                    const effectiveGstin = validated.gstin === undefined
                        ? decryptedPaymentRecord.gstin
                        : validated.gstin || null;
                    updatePayload.kyc_details = {
                        account_type: effectiveGstin ? "BUSINESS" : "INDIVIDUAL",
                        business_type: effectiveGstin ? "B2B" : "Miscellaneous",
                        ...(effectiveGstin ? { gst: effectiveGstin.toUpperCase() } : {}),
                    };
                }

                if (Object.keys(updatePayload).length > 0) {
                    try {
                        await cfUpdateVendor(decryptedVendorId, updatePayload);
                    } catch (error) {
                        if (!(error instanceof CashfreeVendorNotFoundError)) throw error;

                        const ensuredVendorId = await cfEnsureVendor({
                            vendor_id: decryptedVendorId,
                            display_name: currentUser.name || decryptedPaymentRecord.accountHolderName,
                            email: currentUser.email || undefined,
                            phone: currentUser.phone || undefined,
                            account_holder: decryptedPaymentRecord.accountHolderName,
                            account_number: decryptedPaymentRecord.accountNumber,
                            ifsc: decryptedPaymentRecord.ifscCode,
                            gstin: validated.gstin === undefined ? decryptedPaymentRecord.gstin || undefined : validated.gstin || undefined,
                        });
                        const encryptedVendorId = encryptionService.encrypt(ensuredVendorId);
                        await prisma.paymentDetails.update({
                            where: { userId: currentUser.id },
                            data: {
                                cashfreeVendorId: encryptedVendorId.encrypted,
                                vendorIdIV: encryptedVendorId.iv,
                                encryptionVersion: encryptionService.getKeyVersion(),
                            },
                        });
                    }
                }
            } else if (decryptedPaymentRecord) {
                const vendorId = await cfEnsureVendor({
                    vendor_id: `v_${currentUser.id}`,
                    display_name: currentUser.name || decryptedPaymentRecord.accountHolderName,
                    email: currentUser.email || undefined,
                    phone: currentUser.phone || undefined,
                    account_holder: decryptedPaymentRecord.accountHolderName,
                    account_number: decryptedPaymentRecord.accountNumber,
                    ifsc: decryptedPaymentRecord.ifscCode,
                    gstin: decryptedPaymentRecord.gstin || undefined,
                });
                const encryptedVendorId = encryptionService.encrypt(vendorId);
                await prisma.paymentDetails.update({
                    where: { userId: currentUser.id },
                    data: {
                        cashfreeVendorId: encryptedVendorId.encrypted,
                        vendorIdIV: encryptedVendorId.iv,
                        encryptionVersion: encryptionService.getKeyVersion(),
                    },
                });
            }
        } catch (syncError) {
            console.error('[PaymentDetails] Cashfree vendor sync failed:', syncError);
            if (process.env.NODE_ENV === "production") {
                vendorSyncFailed = true;
            } else {
                console.warn('[PaymentDetails] Bypassing Cashfree vendor sync failure in non-production mode');
            }
        }

        if (vendorSyncFailed) {
            return createErrorResponse(
                'Bank details were saved, but payout-provider synchronization failed. Please retry before accepting bookings.',
                502
            );
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
