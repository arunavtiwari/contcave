"use server";

import crypto from "crypto";

import { createAction } from "@/lib/actions-utils";
import { sendEmail } from "@/lib/email/mailer";
import { getCustomerOnboardingTemplate, getHostOnboardingTemplate, getResetPasswordTemplate } from "@/lib/email/templates";
import { UserService } from "@/lib/user/service";
import { ownerRegisterSchema, registerSchema, resetPasswordSchema } from "@/schemas/auth";
import { emailVerificationSchema } from "@/schemas/verification";
import { UserRole } from "@/types/user";

/**
 * Enterprise Member Registration Action.
 * Consolidates registration logic and onboarding triggers into a single Server Action.
 */
export const registerUserAction = createAction(
    registerSchema,
    { requireAuth: false },
    async (data) => {
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

        // 2. Trigger Onboarding Email
        sendEmail({
            toEmail: user.email!,
            subject: "Welcome to the ContCave Partner Program!",
            html: getHostOnboardingTemplate(user.name || "partner"),
        }).catch(err => console.error("[OwnerRegistrationAction] Email Failed:", err));

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
        const { email } = data;
        const trimmedEmail = email.trim().toLowerCase();

        const user = await UserService.findByEmail(trimmedEmail);
        if (!user || !user.email) {
            // Standard security practice: return success even if user not found
            return { message: "If an account exists, a reset email has been sent." };
        }

        const resetToken = crypto.randomBytes(32).toString("hex");
        const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

        await UserService.createResetToken(user.id, resetToken, resetTokenExpiry);

        const nextAuthUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
        const resetUrl = `${nextAuthUrl}/reset-password?token=${resetToken}`;

        try {
            const html = getResetPasswordTemplate(user.name || "User", resetUrl);
            await sendEmail({
                toEmail: user.email,
                toName: user.name || "User",
                subject: "Reset your password",
                html,
            });
        } catch (_error) {
            await UserService.clearResetToken(user.id).catch(() => { });
            throw new Error("Failed to send reset email.");
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
        const { token, password } = data;

        const user = await UserService.findByResetToken(token);
        if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
            throw new Error("Invalid or expired reset token.");
        }

        await UserService.updatePassword(user.id, password);
        await UserService.clearResetToken(user.id);

        return { success: true };
    }
);
