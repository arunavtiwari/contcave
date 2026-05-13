import { NextRequest } from "next/server";

import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";
import { UserService } from "@/lib/user/service";
import { resetPasswordSchema } from "@/schemas/auth";

export async function POST(request: NextRequest) {
    try {
        if (!request.headers.get("content-type")?.includes("application/json")) {
            return createErrorResponse("Content-Type must be application/json", 415);
        }

        const body = await request.json().catch(() => ({}));
        const validation = resetPasswordSchema.safeParse(body);
        if (!validation.success) return createErrorResponse(validation.error.issues[0].message, 400);

        const { token, password } = validation.data;
        const trimmedToken = token.trim();

        try {
            await UserService.resetPasswordByToken(trimmedToken, password);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Invalid or expired reset token";
            return createErrorResponse(message, 400);
        }

        return createSuccessResponse({ message: "Password updated successfully" }, 200);
    } catch (error) {
        return handleRouteError(error, "POST /api/auth/reset-password");
    }
}
