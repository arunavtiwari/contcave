"use server";

import { headers } from "next/headers";
import { z } from "zod";

import { createAction } from "@/lib/actions-utils";
import { UserFacingError } from "@/lib/errors";
import { rateLimitRequest } from "@/lib/security/rateLimit";
import { VerificationService } from "@/lib/verification/service";
import { emailVerificationCodeSchema, emailVerificationSchema } from "@/schemas/verification";
import { UserRole } from "@/types/user";

const vendorPayloadSchema = z.object({
    display_name: z.string().trim().min(1).max(100),
    email: z.string().trim().email().max(255).optional(),
    phone: z.string().trim().regex(/^\d{10}$/, "Phone number must be exactly 10 digits").optional(),
    account_holder: z.string().trim().min(2).max(100),
    account_number: z.string().trim().regex(/^\d{9,20}$/, "Account number must be 9 to 20 digits"),
    ifsc: z.string().trim().toUpperCase().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC code"),
    gstin: z.string().trim().toUpperCase().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, "Invalid GSTIN").optional(),
});

const phoneStepSchema = z.object({
    step: z.literal("phone"),
    phone: z.string().trim().regex(/^\d{10}$/, "Phone number must be exactly 10 digits"),
});

const bankVerificationSchema = vendorPayloadSchema.extend({
    bankName: z.string().trim().min(2).max(100),
    companyName: z.string().trim().min(2).max(200).optional(),
});

async function enforceVerificationLimit(scope: string, limit: number) {
    const result = rateLimitRequest(await headers(), { scope, limit, windowMs: 15 * 60 * 1000 });
    if (!result.allowed) throw new UserFacingError("Too many verification attempts. Please wait and try again.");
}

const requestEmailVerification = createAction(
    emailVerificationSchema,
    { requireAuth: true },
    async ({ email }, { user }) => {
        await enforceVerificationLimit(`request-email-code:${user.id}`, 3);
        return await VerificationService.requestEmailVerificationCode(user.id, email);
    }
);

export async function requestEmailVerificationAction(email: string) {
    return await requestEmailVerification({ email });
}

export const confirmEmailVerificationAction = createAction(
    emailVerificationCodeSchema,
    { requireAuth: true },
    async ({ code }, { user }) => {
        await enforceVerificationLimit(`confirm-email-code:${user.id}`, 10);
        return await VerificationService.confirmEmailVerificationCode(user.id, code);
    }
);

export const verifyBankAction = createAction(
    bankVerificationSchema,
    { requireAuth: true, allowedRoles: [UserRole.OWNER, UserRole.ADMIN] },
    async (payload, { user }) => {
        await enforceVerificationLimit(`verify-bank:${user.id}`, 5);
        const vendor = await VerificationService.createVendor(user.id, payload);
        const updatedUser = await VerificationService.updateStep(user.id, {
            step: "bank",
            bankVerifiedName: payload.account_holder,
            vendorId: vendor.vendor_id,
            accountNumber: payload.account_number,
            ifscCode: payload.ifsc,
            bankName: payload.bankName,
            gstin: payload.gstin,
            companyName: payload.companyName,
        });
        return { user: updatedUser };
    }
);

export const updateVerificationStepAction = createAction(
    phoneStepSchema,
    { requireAuth: true, allowedRoles: [UserRole.OWNER, UserRole.ADMIN] },
    async (data, { user }) => {
        await enforceVerificationLimit(`save-phone:${user.id}`, 10);
        return await VerificationService.updateStep(user.id, data);
    }
);
