import prisma from "@/lib/prismadb";
import bcrypt from "bcryptjs";
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { token, password } = body;

        if (!token || !password) {
            return createErrorResponse("Missing token or password", 400);
        }

        const user = await prisma.user.findFirst({
            where: {
                resetToken: token,
                resetTokenExpiry: {
                    gt: new Date(),
                },
            },
        });

        if (!user) {
            return createErrorResponse("Invalid or expired token", 400);
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
