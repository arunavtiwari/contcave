import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";

import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";
import prisma from "@/lib/prismadb";

function validatePassword(password: string): { valid: boolean; message?: string } {
    if (password.length < 8) {
        return { valid: false, message: "Password must be at least 8 characters long" };
    }
    if (password.length > 128) {
        return { valid: false, message: "Password must be less than 128 characters" };
    }
    if (!/[A-Z]/.test(password)) {
        return { valid: false, message: "Password must contain at least one uppercase letter" };
    }
    if (!/[a-z]/.test(password)) {
        return { valid: false, message: "Password must contain at least one lowercase letter" };
    }
    if (!/\d/.test(password)) {
        return { valid: false, message: "Password must contain at least one number" };
    }
    return { valid: true };
}

export async function POST(request: NextRequest) {
    try {
        if (!request.headers.get("content-type")?.includes("application/json")) {
            return createErrorResponse("Content-Type must be application/json", 415);
        }

        const body = await request.json().catch(() => ({}));
        const { token, password } = body;

        if (!token || typeof token !== "string" || token.trim().length === 0) {
            return createErrorResponse("Token is required and must be a non-empty string", 400);
        }

        if (!password || typeof password !== "string") {
            return createErrorResponse("Password is required and must be a string", 400);
        }

        const passwordValidation = validatePassword(password);
        if (!passwordValidation.valid) {
            return createErrorResponse(passwordValidation.message || "Invalid password", 400);
        }

        const trimmedToken = token.trim();

        const user = await prisma.user.findFirst({
            where: {
                resetToken: trimmedToken,
                resetTokenExpiry: {
                    gt: new Date(),
                },
            },
            select: { id: true },
        });

        if (!user) {
            return createErrorResponse("Invalid or expired reset token", 400);
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                hashedPassword,
                resetToken: null,
                resetTokenExpiry: null,
            },
        });

        return createSuccessResponse(
            { message: "Password updated successfully" },
            200
        );
    } catch (error) {
        return handleRouteError(error, "POST /api/auth/reset-password");
    }
}
