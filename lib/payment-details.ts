import { PaymentDetails, PrismaClient } from '@prisma/client';

import { encryptionService } from './security/encryption';

const prisma = new PrismaClient();

export interface PaymentDetailsData {
    userId: string;
    accountHolderName: string;
    bankName: string;
    accountNumber?: string;
    ifscCode: string;
    companyName?: string;
    gstin?: string;
    cashfreeVendorId?: string;
    accountNumberIV?: string;
    gstinIV?: string;
    ifscCodeIV?: string;
    vendorIdIV?: string;
    encryptionVersion?: string;
}

export interface UpsertPaymentDetailsInput {
    userId: string;
    accountHolderName?: string;
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    companyName?: string;
    gstin?: string;
    cashfreeVendorId?: string;
}

export interface SanitizedPaymentDetails {
    id: string;
    userId: string;
    accountHolderName: string;
    bankName: string;
    accountNumber: string;
    reAccountNumber: string;
    ifscCode: string;
    companyName?: string | null;
    gstin?: string | null;
    cashfreeVendorId?: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface PaymentDetailsResponse {
    success: boolean;
    data?: SanitizedPaymentDetails;
    error?: string;
}

export interface DeleteResponse {
    success: boolean;
    error?: string;
}

const maskGstin = (value: string) => encryptionService.mask(value, 4);

export interface DecryptedPaymentDetails extends Omit<PaymentDetails, 'accountNumber' | 'ifscCode' | 'gstin' | 'cashfreeVendorId'> {
    accountNumber: string;
    ifscCode: string;
    gstin: string | null;
    cashfreeVendorId: string | null;
}

export function decryptPaymentDetailsInternal(paymentDetails: PaymentDetails): DecryptedPaymentDetails {
    let accountNumber = paymentDetails.accountNumber;
    if (paymentDetails.accountNumberIV) {
        try {
            accountNumber = encryptionService.decrypt({
                encrypted: paymentDetails.accountNumber,
                iv: paymentDetails.accountNumberIV
            });
        } catch (error) {
            console.error('[Decryption] Failed to decrypt account number. Data corrupted:', error);
            throw new Error('Critical: Failed to decrypt account number');
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
            gstin = null;
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
            console.error('[Decryption] Failed to decrypt IFSC Code. Data corrupted:', error);
            throw new Error('Critical: Failed to decrypt IFSC Code');
        }
    }

    let cashfreeVendorId = paymentDetails.cashfreeVendorId;
    if (paymentDetails.cashfreeVendorId && paymentDetails.vendorIdIV) {
        try {
            cashfreeVendorId = encryptionService.decrypt({
                encrypted: paymentDetails.cashfreeVendorId,
                iv: paymentDetails.vendorIdIV
            });
        } catch (error) {
            console.error('Failed to decrypt Cashfree Vendor ID:', error);
            cashfreeVendorId = null;
        }
    }

    return {
        ...paymentDetails,
        accountNumber,
        ifscCode,
        gstin,
        cashfreeVendorId,
    };
}

export function decryptAndSanitizePaymentDetails(paymentDetails: PaymentDetails): SanitizedPaymentDetails {
    const decrypted = decryptPaymentDetailsInternal(paymentDetails);

    const maskedAccountNumber = encryptionService.mask(decrypted.accountNumber, 4);

    return {
        id: decrypted.id,
        userId: decrypted.userId,
        accountHolderName: decrypted.accountHolderName,
        bankName: decrypted.bankName,
        accountNumber: maskedAccountNumber,
        reAccountNumber: maskedAccountNumber,
        ifscCode: decrypted.ifscCode,
        companyName: decrypted.companyName,
        gstin: decrypted.gstin ? maskGstin(decrypted.gstin) : null,
        cashfreeVendorId: decrypted.cashfreeVendorId ? encryptionService.mask(decrypted.cashfreeVendorId) : null,
        createdAt: decrypted.createdAt,
        updatedAt: decrypted.updatedAt,
    };
}

export async function getPaymentDetailsByUserId(userId: string): Promise<PaymentDetails | null> {
    try {
        return await prisma.paymentDetails.findFirst({
            where: { userId },
        });
    } catch (error) {
        console.error('Error fetching payment details:', error);
        throw new Error('Failed to fetch payment details');
    }
}

export async function upsertPaymentDetails(data: PaymentDetailsData): Promise<PaymentDetails> {
    try {
        const existing = await prisma.paymentDetails.findFirst({
            where: { userId: data.userId },
        });

        const commonData: Record<string, unknown> = {
            updatedAt: new Date(),
        };

        if (data.accountHolderName !== undefined) commonData.accountHolderName = data.accountHolderName;
        if (data.bankName !== undefined) commonData.bankName = data.bankName;
        if (data.ifscCode !== undefined) {
            commonData.ifscCode = data.ifscCode;
            commonData.ifscCodeIV = data.ifscCodeIV ?? null;
        }
        if (data.companyName !== undefined) commonData.companyName = data.companyName ?? null;

        if (data.gstin !== undefined) {
            commonData.gstin = data.gstin;
            commonData.gstinIV = data.gstinIV ?? null;
        }

        if (data.cashfreeVendorId !== undefined) {
            commonData.cashfreeVendorId = data.cashfreeVendorId;
            commonData.vendorIdIV = data.vendorIdIV ?? null;
        }

        if (existing) {
            const updateData: Record<string, unknown> = { ...commonData };
            if (data.accountNumber !== undefined) {
                updateData.accountNumber = data.accountNumber;
                updateData.accountNumberIV = data.accountNumberIV ?? null;
            }
            if (data.encryptionVersion !== undefined) {
                updateData.encryptionVersion = data.encryptionVersion;
            }

            return await prisma.paymentDetails.update({
                where: { id: existing.id },
                data: updateData,
            });
        }

        if (!data.accountNumber || !data.ifscCode || !data.bankName || !data.accountHolderName) {
            throw new Error('Complete bank details (account number, IFSC, bank name, holder name) are required to create payment details');
        }

        return await prisma.paymentDetails.create({
            data: {
                userId: data.userId,
                accountHolderName: data.accountHolderName,
                bankName: data.bankName,
                accountNumber: data.accountNumber,
                accountNumberIV: data.accountNumberIV ?? null,
                ifscCode: data.ifscCode,
                ifscCodeIV: data.ifscCodeIV ?? null,
                companyName: data.companyName ?? null,
                gstin: data.gstin ?? null,
                gstinIV: data.gstinIV ?? null,
                cashfreeVendorId: data.cashfreeVendorId ?? null,
                vendorIdIV: data.vendorIdIV ?? null,
                encryptionVersion: data.encryptionVersion ?? 'v1',
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        });

    } catch (error) {
        console.error('Error upserting payment details:', error);
        throw error;
    }
}

export async function deletePaymentDetails(userId: string): Promise<void> {
    try {
        const existing = await prisma.paymentDetails.findFirst({ where: { userId } });

        if (existing) {
            await prisma.paymentDetails.delete({
                where: { id: existing.id },
            });
        }
    } catch (error) {
        console.error('Error deleting payment details:', error);
        throw new Error('Failed to delete payment details');
    }
}

export async function getPaymentDetailsSafe(userId: string): Promise<PaymentDetailsResponse> {
    try {
        const paymentDetails = await getPaymentDetailsByUserId(userId);
        if (!paymentDetails) return { success: true };

        return {
            success: true,
            data: decryptAndSanitizePaymentDetails(paymentDetails)
        };
    } catch (error) {
        console.error('getPaymentDetailsSafe error:', error);
        return { success: false, error: 'Failed to fetch and process payment details' };
    }
}

export async function upsertPaymentDetailsSafe(input: UpsertPaymentDetailsInput): Promise<PaymentDetailsResponse> {
    try {
        const { accountNumber, ifscCode, gstin, cashfreeVendorId, ...rest } = input;

        let encryptedAccountNumber = undefined;
        let accountNumberIV = undefined;
        if (accountNumber && !accountNumber.includes('*')) {
            const result = encryptionService.encrypt(accountNumber.trim());
            encryptedAccountNumber = result.encrypted;
            accountNumberIV = result.iv;
        }

        let encryptedIfscCode = undefined;
        let ifscCodeIV = undefined;
        if (ifscCode) {
            const result = encryptionService.encrypt(ifscCode.trim().toUpperCase());
            encryptedIfscCode = result.encrypted;
            ifscCodeIV = result.iv;
        }

        let encryptedGstin = undefined;
        let gstinIV = undefined;
        if (gstin && !gstin.includes('*')) {
            const result = encryptionService.encrypt(gstin.trim().toUpperCase());
            encryptedGstin = result.encrypted;
            gstinIV = result.iv;
        }

        let encryptedVendorId = undefined;
        let vendorIdIV = undefined;
        if (cashfreeVendorId && !cashfreeVendorId.includes('*')) {
            const result = encryptionService.encrypt(cashfreeVendorId.trim());
            encryptedVendorId = result.encrypted;
            vendorIdIV = result.iv;
        }

        const paymentDetailsData: PaymentDetailsData = {
            ...rest,
            userId: input.userId,
            ...(encryptedIfscCode ? {
                ifscCode: encryptedIfscCode,
                ifscCodeIV: ifscCodeIV
            } : {}),
            ...(encryptedAccountNumber ? {
                accountNumber: encryptedAccountNumber,
                accountNumberIV: accountNumberIV
            } : {}),
            ...(encryptedGstin ? {
                gstin: encryptedGstin,
                gstinIV: gstinIV
            } : {}),
            ...(encryptedVendorId ? {
                cashfreeVendorId: encryptedVendorId,
                vendorIdIV: vendorIdIV
            } : {}),
            encryptionVersion: encryptionService.getKeyVersion(),
        } as PaymentDetailsData;

        const result = await upsertPaymentDetails(paymentDetailsData);
        return {
            success: true,
            data: decryptAndSanitizePaymentDetails(result)
        };
    } catch (error) {
        console.error('upsertPaymentDetailsSafe error:', error);
        return { success: false, error: 'Failed to save and process payment details' };
    }
}

export async function deletePaymentDetailsSafe(userId: string): Promise<DeleteResponse> {
    try {
        await deletePaymentDetails(userId);
        return { success: true };
    } catch {
        return { success: false, error: 'Failed to delete payment details' };
    }
}

