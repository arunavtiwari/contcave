import { z } from "zod";

export const phoneVerificationSchema = z.object({
  phone: z.string().regex(/^[0-9]{10}$/, "Phone number must be exactly 10 digits"),
});

export const emailVerificationSchema = z.object({
  email: z.string().trim().email("Invalid email format").max(255, "Email is too long"),
});

export const emailVerificationCodeSchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit verification code"),
});

function refineGstBusinessDetails(
  data: { gstNumber?: string; companyName?: string; companyAddress?: string },
  ctx: z.RefinementCtx
) {
  const hasGst = Boolean(data.gstNumber && data.gstNumber.trim().length > 0);
  if (hasGst) {
    if (!data.companyName || data.companyName.trim().length < 2) {
      ctx.addIssue({
        code: "custom",
        path: ["companyName"],
        message: "Company name is required when GST is provided",
      });
    }
    if (!data.companyAddress || data.companyAddress.trim().length < 5) {
      ctx.addIssue({
        code: "custom",
        path: ["companyAddress"],
        message: "Registered business address is required when GST is provided",
      });
    }
  }
}

export const bankSchema = z.object({
  accountHolderName: z.string().trim().min(2, "Name is required").max(100),
  accountNumber: z.string().trim().min(9, "Account number too short").max(20, "Account number too long").regex(/^\d+$/, "Account number must be a number"),
  ifscCode: z.string().trim().toUpperCase().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC Code format"),
  bankName: z.string().trim().min(2, "Bank name is required").max(100),
  gstNumber: z.string().trim().toUpperCase().refine((val: string) => val === "" || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(val), "Invalid GSTIN format").optional(),
  companyName: z.string().trim().max(150, "Company name is too long").optional(),
  companyAddress: z.string().trim().max(500, "Address is too long").optional(),
}).superRefine(refineGstBusinessDetails);

export type PhoneVerificationSchema = z.infer<typeof phoneVerificationSchema>;
export type EmailVerificationSchema = z.infer<typeof emailVerificationSchema>;
export type BankSchema = z.infer<typeof bankSchema>;

export const unifiedVerificationSchema = z.object({
  email: z.string().email("Invalid email"),
  phone: z.string().regex(/^\d{10}$/, "Enter a valid 10-digit mobile number"),
  accountHolderName: z.string().trim().min(2, "Account holder name is required").max(100, "Account holder name is too long"),
  accountNumber: z.string().trim().regex(/^\d{9,20}$/, "Account number must be 9 to 20 digits"),
  bankName: z.string().trim().min(2, "Bank name is required").max(100, "Bank name is too long"),
  ifscCode: z.string().trim().toUpperCase().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC Code format"),
  gstNumber: z.string().trim().toUpperCase().refine((val: string) => val === "" || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(val), "Invalid GSTIN format").optional(),
  companyName: z.string().trim().max(150, "Company name is too long").optional(),
  companyAddress: z.string().trim().max(500, "Address is too long").optional(),
}).superRefine(refineGstBusinessDetails);

export type UnifiedVerificationValues = z.infer<typeof unifiedVerificationSchema>;

