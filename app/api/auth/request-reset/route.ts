import prisma from "@/lib/prismadb";
import { sendTemplateEmail } from "@/lib/email/mailer";
import crypto from "crypto";
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";
import { NextRequest } from "next/server";

function validateEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: NextRequest) {
    try {
        if (!request.headers.get("content-type")?.includes("application/json")) {
            return createErrorResponse("Content-Type must be application/json", 415);
        }

        const body = await request.json().catch(() => ({}));
        const { email } = body;

        if (!email || typeof email !== "string") {
            return createErrorResponse("Email is required and must be a string", 400);
        }

        const trimmedEmail = email.trim().toLowerCase();
        if (!validateEmail(trimmedEmail)) {
            return createErrorResponse("Invalid email format", 400);
        }

        if (trimmedEmail.length > 255) {
            return createErrorResponse("Email is too long", 400);
        }

        const user = await prisma.user.findUnique({
            where: { email: trimmedEmail },
            select: {
                id: true,
                email: true,
                name: true,
            },
        });

        if (!user || !user.email) {
            return createSuccessResponse(
                { message: "If an account exists, a reset email has been sent." },
                200
            );
        }

        const resetToken = crypto.randomBytes(32).toString("hex");
        const resetTokenExpiry = new Date(Date.now() + 3600000);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                resetToken,
                resetTokenExpiry,
            },
        });

        const nextAuthUrl = process.env.NEXTAUTH_URL;
        if (!nextAuthUrl || typeof nextAuthUrl !== "string" || !nextAuthUrl.startsWith("http")) {
            if (process.env.NODE_ENV === "development") {
                console.error("[Request Reset] NEXTAUTH_URL is missing or invalid");
            }
            return createErrorResponse("Server configuration error", 500);
        }

        const resetUrl = `${nextAuthUrl}/reset-password?token=${resetToken}`;
        const TEMPLATE_ID = process.env.MS_TPL_RESET_PASSWORD;

        if (!TEMPLATE_ID || typeof TEMPLATE_ID !== "string") {
            if (process.env.NODE_ENV === "development") {
                console.error("[Request Reset] MS_TPL_RESET_PASSWORD is missing");
            }
            return createErrorResponse("Server configuration error", 500);
        }

        try {
            await sendTemplateEmail({
                toEmail: user.email,
                toName: user.name || "User",
                templateId: TEMPLATE_ID,
                data: {
                    reset_url: resetUrl,
                    user_name: user.name || "User",
                },
            });
        } catch (emailError) {
            if (process.env.NODE_ENV === "development") {
                console.error("[Request Reset] Failed to send email:", emailError);
            }
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    resetToken: null,
                    resetTokenExpiry: null,
                },
            }).catch(() => {});
            return createErrorResponse("Failed to send reset email. Please try again later.", 500);
        }

        return createSuccessResponse(
            { message: "If an account exists, a reset email has been sent." },
            200
        );
    } catch (error) {
        return handleRouteError(error, "POST /api/auth/request-reset");
    }
}
