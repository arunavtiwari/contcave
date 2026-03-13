import { z } from 'zod';

export const paymentDetailsSchema = z.object({
    accountHolderName: z.string()
        .min(2, 'Account holder name must be at least 2 characters')
        .max(100, 'Account holder name is too long')
        .regex(/^[a-zA-Z\s.'-]+$/, 'Invalid characters in account holder name'),
    bankName: z.string()
        .min(1, 'Bank name is required')
        .max(100, 'Bank name is too long'),
    accountNumber: z.string()
        .min(9, 'Account number is too short')
        .max(20, 'Account number is too long')
        .regex(/^\d+$/, 'Account number must contain only digits'),
    ifscCode: z.string()
        .length(11, 'IFSC must be exactly 11 characters')
        .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC format'),
    companyName: z.string()
        .max(100, 'Company name is too long')
        .optional()
        .nullable(),
    gstin: z.string()
        .max(15, 'GSTIN is too long')
        .regex(/^[0-9A-Z]{15}$/i, 'Invalid GSTIN format')
        .optional()
        .nullable()
});

export const paymentDetailsUpdateSchema = paymentDetailsSchema.partial();

export type PaymentDetailsInput = z.infer<typeof paymentDetailsSchema>;
