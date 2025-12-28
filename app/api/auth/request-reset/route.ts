import prisma from "@/lib/prismadb";
import { sendTemplateEmail } from "@/lib/email/mailer";
import crypto from "crypto";
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email } = body;

        if (!email) {
            return createErrorResponse("Email is required", 400);
        }

        const user = await prisma.user.findUnique({
            where: { email },
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

        const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${resetToken}`;
        const TEMPLATE_ID = process.env.MS_TPL_RESET_PASSWORD!;

        await sendTemplateEmail({
            toEmail: user.email,
            toName: user.name || "User",
            templateId: TEMPLATE_ID,
            data: {
                reset_url: resetUrl,
                user_name: user.name || "User",
            },
        });

        return createSuccessResponse(
            { message: "If an account exists, a reset email has been sent." },
            200
        );
    } catch (error) {
        return handleRouteError(error, "POST /api/auth/request-reset");
    }
}
