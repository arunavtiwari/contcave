"use server";

import crypto from "crypto";
import { headers } from "next/headers";

import { createAction } from "@/lib/actions-utils";
import { sendEmail } from "@/lib/email/mailer";
import { getCustomerOnboardingTemplate, getResetPasswordTemplate } from "@/lib/email/templates";
import { UserFacingError } from "@/lib/errors";
import { rateLimitRequest } from "@/lib/security/rateLimit";
import { UserService } from "@/lib/user/service";
import { getValidatedBaseUrl } from "@/lib/utils";
import { ownerRegisterSchema, registerSchema, resetPasswordSchema } from "@/schemas/auth";
import { emailVerificationSchema } from "@/schemas/verification";
import { UserRole } from "@/types/user";

async function enforcePublicActionLimit(scope: string, limit: number) {
    const result = rateLimitRequest(await headers(), {
        scope,
        limit,
        windowMs: 15 * 60 * 1000,
    });
    if (!result.allowed) {
        throw new UserFacingError("Too many attempts. Please wait and try again.");
    }
}

/**
 * Enterprise Member Registration Action.
 * Consolidates registration logic and onboarding triggers into a single Server Action.
 */
export const registerUserAction = createAction(
    registerSchema,
    { requireAuth: false },
    async (data) => {
        await enforcePublicActionLimit("action:register-customer", 5);
        const { email, name, password } = data;
        const trimmedEmail = email.trim().toLowerCase();

        // 1. Register User
        const user = await UserService.register({
            email: trimmedEmail,
            name: name.trim(),
            password,
            role: UserRole.CUSTOMER
        });

        // 2. Trigger Onboarding Email (Fire and forget in background)
        sendEmail({
            toEmail: user.email!,
            subject: "Welcome to ContCave!",
            html: getCustomerOnboardingTemplate(user.name || "there"),
        }).catch(err => console.error("[RegistrationAction] Email Failed:", err));

        return { id: user.id, email: user.email, name: user.name };
    }
);

/**
 * Enterprise Owner Registration Action.
 */
export const registerOwnerAction = createAction(
    ownerRegisterSchema,
    { requireAuth: false },
    async (data) => {
        await enforcePublicActionLimit("action:register-owner", 5);
        const { email, name, phone, password } = data;
        const trimmedEmail = email.trim().toLowerCase();

        // 1. Register Owner
        const user = await UserService.register({
            email: trimmedEmail,
            name: name.trim(),
            phone: phone.trim(),
            password,
            role: UserRole.OWNER
        });

        return { id: user.id, email: user.email, name: user.name };
    }
);

/**
 * Request Password Reset Action.
 */
export const requestPasswordResetAction = createAction(
    emailVerificationSchema,
    { requireAuth: false },
    async (data) => {
        await enforcePublicActionLimit("action:password-reset-request", 5);
        const { email } = data;
        const trimmedEmail = email.trim().toLowerCase();

        const user = await UserService.findByEmail(trimmedEmail);
        if (!user || !user.email) {
            // Standard security practice: return success even if user not found
            return { message: "If an account exists, a reset email has been sent." };
        }

        const resetBaseUrl = getValidatedBaseUrl();
        const resetToken = crypto.randomBytes(32).toString("hex");
        const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

        await UserService.createResetToken(user.id, resetToken, resetTokenExpiry);

        const resetUrl = `${resetBaseUrl}/reset-password?token=${resetToken}`;

        try {
            const html = getResetPasswordTemplate(user.name || "User", resetUrl);
            await sendEmail({
                toEmail: user.email,
                toName: user.name || "User",
                subject: "Reset your password",
                html,
            });
        } catch (error) {
            await UserService.clearResetToken(user.id).catch(() => { });
            console.error("[PasswordResetAction] Failed to send reset email", error);
        }

        return { message: "If an account exists, a reset email has been sent." };
    }
);

/**
 * Reset Password Action (The actual update).
 */
export const resetPasswordAction = createAction(
    resetPasswordSchema,
    { requireAuth: false },
    async (data) => {
        await enforcePublicActionLimit("action:password-reset", 10);
        const { token, password } = data;

        return await UserService.resetPasswordByToken(token.trim(), password);
    }
);

