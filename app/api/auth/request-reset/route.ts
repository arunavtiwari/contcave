import crypto from "crypto";
import { NextRequest } from "next/server";

import { createErrorResponse, createSuccessResponse, handleRouteError, readJsonObject } from "@/lib/api-utils";
import { sendEmail } from "@/lib/email/mailer";
import { getResetPasswordTemplate } from "@/lib/email/templates";
import { formatRetryAfterMs, rateLimitRequest } from "@/lib/security/rateLimit";
import { UserService } from "@/lib/user/service";
import { getValidatedBaseUrl } from "@/lib/utils";
import { emailVerificationSchema } from "@/schemas/verification";

export async function POST(request: NextRequest) {
    try {
        const requestLimit = rateLimitRequest(request.headers, {
            scope: "password-reset-request",
            limit: 5,
            windowMs: 15 * 60 * 1000,
        });
        if (!requestLimit.allowed) {
            const response = createErrorResponse("Too many reset attempts. Please try again later.", 429);
            response.headers.set("Retry-After", formatRetryAfterMs(requestLimit.resetAt));
            return response;
        }

        const parsedBody = await readJsonObject(request, 10_000);
        if (!parsedBody.success) return parsedBody.response;
        const body = parsedBody.data;
        const validation = emailVerificationSchema.safeParse(body);
        if (!validation.success) return createErrorResponse(validation.error.issues[0].message, 400);

        const { email } = validation.data;
        const trimmedEmail = email.trim().toLowerCase();

        const user = await UserService.findByEmail(trimmedEmail);
        if (!user || !user.email) {
            return createSuccessResponse({ message: "If an account exists, a reset email has been sent." }, 200);
        }

        const resetToken = crypto.randomBytes(32).toString("hex");
        const resetTokenExpiry = new Date(Date.now() + 3600000);

        await UserService.createResetToken(user.id, resetToken, resetTokenExpiry);

        const appUrl = getValidatedBaseUrl();

        const resetUrl = `${appUrl}/reset-password?token=${resetToken}`;

        try {
            const html = getResetPasswordTemplate(user.name || "User", resetUrl);
            await sendEmail({
                toEmail: user.email,
                toName: user.name || "User",
                subject: "Reset your password",
                html,
            });
        } catch (emailError) {
            await UserService.clearResetToken(user.id).catch(() => { });
            console.error("[PasswordReset] Failed to send reset email", emailError);
        }

        return createSuccessResponse({ message: "If an account exists, a reset email has been sent." }, 200);
    } catch (error) {
        return handleRouteError(error, "POST /api/auth/request-reset");
    }
}
