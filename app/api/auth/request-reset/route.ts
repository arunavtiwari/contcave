import { NextRequest } from "next/server";

import { createErrorResponse, createSuccessResponse, handleRouteError, readJsonObject } from "@/lib/api-utils";
import { formatRetryAfterMs, rateLimitRequest } from "@/lib/security/rateLimit";
import { sendPasswordLink } from "@/lib/user/passwordLink";
import { UserService } from "@/lib/user/service";
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

        await sendPasswordLink({ id: user.id, name: user.name, email: user.email }, "reset");

        return createSuccessResponse({ message: "If an account exists, a reset email has been sent." }, 200);
    } catch (error) {
        return handleRouteError(error, "POST /api/auth/request-reset");
    }
}
