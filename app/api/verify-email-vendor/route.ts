import axios from "axios";
import { NextRequest } from "next/server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";
import { getFixieProxyAgent } from "@/lib/fixie-proxy";
import { emailVerificationSchema } from "@/lib/schemas/verification";

export async function POST(request: NextRequest) {
    try {
        if (!request.headers.get("content-type")?.includes("application/json")) {
            return createErrorResponse("Content-Type must be application/json", 415);
        }

        const currentUser = await getCurrentUser();
        if (!currentUser?.id) {
            return createErrorResponse("Unauthorized", 401);
        }

        const body = await request.json().catch(() => ({}));

        // Validate with Zod
        const validation = emailVerificationSchema.safeParse(body);
        if (!validation.success) {
            return createErrorResponse(validation.error.issues[0].message, 400);
        }

        const { email } = validation.data;
        const trimmedEmail = email.trim().toLowerCase();

        const authKey = process.env.MSG91_AUTH_KEY;
        if (!authKey || typeof authKey !== "string") {
            return createErrorResponse("Server configuration error", 500);
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        // Get reusable proxy agent
        const httpsAgent = getFixieProxyAgent();

        try {
            const response = await axios.post(
                "https://control.msg91.com/api/v5/email/validate",
                { email: trimmedEmail },
                {
                    headers: {
                        accept: "application/json",
                        authkey: authKey,
                        "Content-Type": "application/json",
                    },
                    httpsAgent,
                    signal: controller.signal,
                    timeout: 30000,
                }
            );

            clearTimeout(timeoutId);
            return createSuccessResponse({ result: response.data }, 200);
        } catch (fetchError) {
            clearTimeout(timeoutId);
            if (axios.isAxiosError(fetchError)) {
                const status = fetchError.response?.status || 500;
                const errorData = fetchError.response?.data || fetchError.message;

                console.error(`[MSG91 Vendor Email] Upstream Error (${status}):`, JSON.stringify(errorData));

                if (status === 401 || status === 403) {
                    return createErrorResponse(`Email verification service auth failed. check MSG91_AUTH_KEY or IP Whitelist. Upstream: ${JSON.stringify(errorData)}`, 500);
                }

                return createErrorResponse(
                    typeof errorData === "object" ? JSON.stringify(errorData) : String(errorData),
                    status
                );
            }
            if (fetchError instanceof Error && fetchError.name === "AbortError") {
                return createErrorResponse("Request timeout", 408);
            }
            throw fetchError;
        }
    } catch (error) {
        return handleRouteError(error, "POST /api/verify-email-vendor");
    }
}
