import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";

import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";
import prisma from "@/lib/prismadb";
import { resetPasswordSchema } from "@/lib/schemas/auth";

export async function POST(request: NextRequest) {
    try {
        if (!request.headers.get("content-type")?.includes("application/json")) {
            return createErrorResponse("Content-Type must be application/json", 415);
        }

        const body = await request.json().catch(() => ({}));


        const validation = resetPasswordSchema.safeParse(body);
        if (!validation.success) {
            return createErrorResponse(validation.error.issues[0].message, 400);
        }

        const { token, password } = validation.data;
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
