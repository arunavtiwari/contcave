import { z } from "zod";

export const phoneVerificationSchema = z.object({
  phone: z.string().regex(/^[0-9]{10}$/, "Phone number must be exactly 10 digits"),
});

export const emailVerificationSchema = z.object({
  email: z.string().email("Invalid email format").max(255, "Email is too long"),
});

export const otpSchema = z.object({
  otp: z.string().length(6, "OTP must be 6 digits"),
  refId: z.string().min(1, "Reference ID is required").max(100, "Reference ID too long"),
});

export const aadhaarSchema = z.object({
  aadhaarNumber: z.string().regex(/^[2-9]{1}[0-9]{3}\s[0-9]{4}\s[0-9]{4}$|^[2-9]{1}[0-9]{11}$/, "Invalid Aadhaar number format"),
  verifyOtp: z.string().length(6, "OTP must be 6 digits").optional(),
});

export const bankSchema = z.object({
  accountHolderName: z.string().min(2, "Name is required").max(100),
  accountNumber: z.string().min(9, "Account number too short").max(20, "Account number too long").regex(/^\d+$/, "Account number must actally be a number"),
  ifscCode: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC Code format"),
  bankName: z.string().min(2, "Bank name is required"),
  gstNumber: z.string().trim().toUpperCase().refine((val: string) =>val === "" || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(val),"Invalid GSTIN format").optional(),
});

export type PhoneVerificationSchema = z.infer<typeof phoneVerificationSchema>;
export type EmailVerificationSchema = z.infer<typeof emailVerificationSchema>;
export type OtpSchema = z.infer<typeof otpSchema>;
export type AadhaarSchema = z.infer<typeof aadhaarSchema>;
export type BankSchema = z.infer<typeof bankSchema>;
