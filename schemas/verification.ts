import { z } from "zod";

export const phoneVerificationSchema = z.object({
  phone: z.string().regex(/^[0-9]{10}$/, "Phone number must be exactly 10 digits"),
});

export const emailVerificationSchema = z.object({
  email: z.string().email("Invalid email format").max(255, "Email is too long"),
});

export const bankSchema = z.object({
  accountHolderName: z.string().min(2, "Name is required").max(100),
  accountNumber: z.string().min(9, "Account number too short").max(20, "Account number too long").regex(/^\d+$/, "Account number must be a number"),
  ifscCode: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC Code format"),
  bankName: z.string().min(2, "Bank name is required"),
  gstNumber: z.string().trim().toUpperCase().refine((val: string) => val === "" || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(val), "Invalid GSTIN format").optional(),
});

export type PhoneVerificationSchema = z.infer<typeof phoneVerificationSchema>;
export type EmailVerificationSchema = z.infer<typeof emailVerificationSchema>;
export type BankSchema = z.infer<typeof bankSchema>;

export const unifiedVerificationSchema = z.object({
  email: z.string().email("Invalid email"),
  phone: z.string().regex(/^\d{10}$/, "Enter a valid 10-digit mobile number"),
  accountHolderName: z.string().min(1, "Account holder name is required"),
  accountNumber: z.string().min(1, "Account number is required"),
  bankName: z.string().min(1, "Bank name is required"),
  ifscCode: z.string().min(1, "IFSC code is required"),
  gstNumber: z.string().optional(),
});

export type UnifiedVerificationValues = z.infer<typeof unifiedVerificationSchema>;
