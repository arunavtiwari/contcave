import crypto from "crypto";
import { NextRequest } from "next/server";

import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";
import { resetPasswordEmail } from "@/lib/email/email";
import { sendEmail } from "@/lib/email/mailer";
import { UserService } from "@/lib/user/service";
import { emailVerificationSchema } from "@/schemas/verification";

export async function POST(request: NextRequest) {
    try {
        if (!request.headers.get("content-type")?.includes("application/json")) {
            return createErrorResponse("Content-Type must be application/json", 415);
        }

        const body = await request.json().catch(() => ({}));
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

        const nextAuthUrl = process.env.NEXTAUTH_URL;
        if (!nextAuthUrl || !nextAuthUrl.startsWith("http")) {
            return createErrorResponse("Server configuration error", 500);
        }

        const resetUrl = `${nextAuthUrl}/reset-password?token=${resetToken}`;

        try {
            const html = resetPasswordEmail(user.name || "User", resetUrl);
            await sendEmail({
                toEmail: user.email,
                toName: user.name || "User",
                subject: "Reset your password",
                html,
            });
        } catch (_emailError) {
            await UserService.clearResetToken(user.id).catch(() => { });
            return createErrorResponse("Failed to send reset email. Please try again later.", 500);
        }

        return createSuccessResponse({ message: "If an account exists, a reset email has been sent." }, 200);
    } catch (error) {
        return handleRouteError(error, "POST /api/auth/request-reset");
    }
}