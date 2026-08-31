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
        .max(20, 'Account number is too long')
        .refine((v) => !v || v.includes('*') || (/^\d+$/.test(v) && v.length >= 9), 'Account number must be 9-20 digits'),
    ifscCode: z.string()
        .min(1, 'IFSC code is required')
        .refine((v) => /^[A-Za-z]{4}0[A-Za-z0-9]{6}$/.test(v.trim()), 'Invalid IFSC format'),
    companyName: z.string()
        .max(100, 'Company name is too long')
        .optional()
        .nullable(),
    gstin: z.string()
        .refine((v) => !v || v.includes('*') || /^[0-9A-Za-z]{15}$/.test(v.trim()), 'Invalid GSTIN format')
        .optional()
        .nullable()
});

export const paymentDetailsFormSchema = z.object({
    accountHolderName: z.string()
        .min(2, 'Account holder name must be at least 2 characters')
        .max(100, 'Account holder name is too long')
        .regex(/^[a-zA-Z\s.'-]+$/, 'Invalid characters in account holder name'),
    bankName: z.string()
        .min(1, 'Bank name is required')
        .max(100, 'Bank name is too long'),
    accountNumber: z.string()
        .min(1, 'Account number is required')
        .max(20, 'Account number is too long'),
    reAccountNumber: z.string()
        .min(1, 'Re-entering account number is required')
        .max(20, 'Account number is too long'),
    ifscCode: z.string()
        .min(1, 'IFSC code is required')
        .refine((v) => /^[A-Za-z]{4}0[A-Za-z0-9]{6}$/.test(v.trim()), 'Invalid IFSC code format (e.g. HDFC0001234)'),
    companyName: z.string()
        .max(100, 'Company name is too long')
        .optional()
        .or(z.literal('')),
    gstin: z.string()
        .refine((v) => !v || v.includes('*') || /^[0-9A-Za-z]{15}$/.test(v.trim()), 'Invalid GSTIN format (15 characters)')
        .optional()
        .or(z.literal('')),
}).superRefine((data, ctx) => {
    const isMasked = data.accountNumber.includes('*');
    if (!isMasked) {
        if (!/^\d+$/.test(data.accountNumber)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['accountNumber'],
                message: 'Account number must contain only digits',
            });
        }
        if (data.accountNumber.length < 9) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['accountNumber'],
                message: 'Account number must be at least 9 digits',
            });
        }
    }
    if (data.accountNumber !== data.reAccountNumber) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['reAccountNumber'],
            message: 'Account numbers do not match',
        });
    }
});

export type PaymentDetailsFormValues = z.infer<typeof paymentDetailsFormSchema>;

export const paymentDetailsUpdateSchema = paymentDetailsSchema.partial();

export type PaymentDetailsInput = z.infer<typeof paymentDetailsSchema>;

