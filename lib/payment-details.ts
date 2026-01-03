import { PaymentDetails,PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface PaymentDetailsData {
    userId: string;
    accountHolderName: string;
    bankName: string;
    accountNumber?: string;
    ifscCode: string;
    companyName?: string;
    gstin?: string;
    accountNumberIV?: string;
    gstinIV?: string;
    ifscCodeIV?: string;
    encryptionVersion?: string;
}

export interface PaymentDetailsResponse {
    success: boolean;
    data?: PaymentDetails;
    error?: string;
}

export interface DeleteResponse {
    success: boolean;
    error?: string;
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

        const normalizedGstin = data.gstin ? data.gstin.toUpperCase() : null;

        const commonData = {
            accountHolderName: data.accountHolderName,
            bankName: data.bankName,
            ifscCode: data.ifscCode,
            companyName: data.companyName ?? null,
            gstin: normalizedGstin,
            gstinIV: data.gstinIV ?? null,
            ifscCodeIV: data.ifscCodeIV ?? null,
            updatedAt: new Date(),
        };

        if (existing) {
            return await prisma.paymentDetails.update({
                where: { id: existing.id },
                data: data.accountNumber
                    ? { ...commonData, accountNumber: data.accountNumber, accountNumberIV: data.accountNumberIV ?? null, encryptionVersion: data.encryptionVersion ?? null }
                    : commonData,
            });
        }

        if (!data.accountNumber) {
            throw new Error('Account number is required when creating new payment details');
        }

        return await prisma.paymentDetails.create({
            data: {
                ...commonData,
                userId: data.userId,
                accountNumber: data.accountNumber,
                companyName: data.companyName ?? null,
                gstin: normalizedGstin,
                gstinIV: data.gstinIV ?? null,
                accountNumberIV: data.accountNumberIV ?? null,
                ifscCodeIV: data.ifscCodeIV ?? null,
                encryptionVersion: data.encryptionVersion ?? 'v1',
                createdAt: new Date(),
            },
        });

    } catch (error) {
        console.error('Error upserting payment details:', error);
        throw error;
    }
}


// Delete payment details
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

// Safe wrapper for fetching with error response
export async function getPaymentDetailsSafe(userId: string): Promise<PaymentDetailsResponse> {
    try {
        const paymentDetails = await getPaymentDetailsByUserId(userId);
        return { success: true, data: paymentDetails || undefined };
    } catch {
        return { success: false, error: 'Failed to fetch payment details' };
    }
}

// Safe wrapper for upsert with response wrapping
export async function upsertPaymentDetailsSafe(data: PaymentDetailsData): Promise<PaymentDetailsResponse> {
    try {
        const existing = await prisma.paymentDetails.findFirst({ where: { userId: data.userId } });

        let paymentDetails: PaymentDetails;
        const normalizedGstin = data.gstin ? data.gstin.toUpperCase() : null;

        if (existing) {
            interface PaymentDetailsUpdate {
                accountHolderName: string;
                bankName: string;
                ifscCode: string;
                companyName: string | null;
                gstin: string | null;
                updatedAt: Date;
                accountNumber?: string;
                accountNumberIV?: string | null;
                gstinIV?: string | null;
                ifscCodeIV?: string | null;
                encryptionVersion?: string | null;
            }

            const updateData: PaymentDetailsUpdate = {
                accountHolderName: data.accountHolderName,
                bankName: data.bankName,
                ifscCode: data.ifscCode,
                companyName: data.companyName ?? null,
                gstin: normalizedGstin,
                gstinIV: data.gstinIV ?? null,
                ifscCodeIV: data.ifscCodeIV ?? null,
                updatedAt: new Date(),
            };

            if (data.accountNumber) {
                updateData.accountNumber = data.accountNumber;
                updateData.accountNumberIV = data.accountNumberIV ?? null;
                updateData.encryptionVersion = data.encryptionVersion ?? null;
            }

            paymentDetails = await prisma.paymentDetails.update({
                where: { id: existing.id },
                data: updateData,
            });
        } else {
            if (!data.accountNumber) {
                return {
                    success: false,
                    error: 'Account number is required for creating new payment details',
                };
            }

            paymentDetails = await prisma.paymentDetails.create({
                data: {
                    userId: data.userId,
                    accountHolderName: data.accountHolderName,
                    bankName: data.bankName,
                    accountNumber: data.accountNumber,
                    ifscCode: data.ifscCode,
                    companyName: data.companyName ?? null,
                    gstin: normalizedGstin,
                    gstinIV: data.gstinIV ?? null,
                    accountNumberIV: data.accountNumberIV ?? null,
                    ifscCodeIV: data.ifscCodeIV ?? null,
                    encryptionVersion: data.encryptionVersion ?? 'v1',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            });
        }

        return { success: true, data: paymentDetails };
    } catch (error) {
        console.error('Error upserting payment details:', error);
        return { success: false, error: 'Failed to save payment details' };
    }
}

// Safe delete with error response
export async function deletePaymentDetailsSafe(userId: string): Promise<DeleteResponse> {
    try {
        await deletePaymentDetails(userId);
        return { success: true };
    } catch {
        return { success: false, error: 'Failed to delete payment details' };
    }
}

// Type guard to validate complete payment data
export function validatePaymentDetailsData(data: Partial<PaymentDetailsData>): data is PaymentDetailsData {
    return !!(
        data.userId &&
        data.accountHolderName &&
        data.bankName &&
        data.accountNumber &&
        data.ifscCode
    );
}

// Type guard for Prisma errors
export function isPrismaError(error: unknown): error is { code: string; message: string } {
    return typeof error === 'object' && error !== null && 'code' in error;
}
