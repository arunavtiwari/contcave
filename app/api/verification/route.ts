import axios from "axios";
import { NextRequest } from "next/server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";
import { getFixieProxyAgent, handleProxyError } from "@/lib/fixie-proxy";

function validateOTP(otp: string): boolean {
    return /^\d{6}$/.test(otp);
}

function validateRefId(refId: string): boolean {
    return typeof refId === "string" && refId.trim().length > 0 && refId.length <= 100;
}

export async function POST(req: NextRequest) {
    try {
        if (!req.headers.get("content-type")?.includes("application/json")) {
            return createErrorResponse("Content-Type must be application/json", 415);
        }

        const currentUser = await getCurrentUser();
        if (!currentUser?.id) {
            return createErrorResponse("Unauthorized", 401);
        }

        const body = await req.json().catch(() => ({}));
        const { refId, otp } = body;

        if (!refId || typeof refId !== "string") {
            return createErrorResponse("refId is required and must be a string", 400);
        }

        if (!validateRefId(refId)) {
            return createErrorResponse("Invalid refId format", 400);
        }

        if (!otp || typeof otp !== "string") {
            return createErrorResponse("otp is required and must be a string", 400);
        }

        if (!validateOTP(otp)) {
            return createErrorResponse("OTP must be exactly 6 digits", 400);
        }

        const clientId = process.env.CASHFREE_CLIENT_ID;
        const clientSecret = process.env.CASHFREE_CLIENT_SECRET;

        if (!clientId || !clientSecret || typeof clientId !== "string" || typeof clientSecret !== "string") {
            return createErrorResponse("Server configuration error", 500);
        }

        // Get reusable proxy agent
        const httpsAgent = getFixieProxyAgent();

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        try {
            const resp = await axios.post(
                "https://api.cashfree.com/verification/offline-aadhaar/verify",
                {
                    ref_id: refId.trim(),
                    otp: otp.trim(),
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                        "x-client-id": clientId,
                        "x-client-secret": clientSecret,
                    },
                    httpsAgent,
                    signal: controller.signal,
                    timeout: 30000,
                }
            );

            clearTimeout(timeoutId);
            return createSuccessResponse(resp.data, resp.status);
        } catch (fetchError) {
            clearTimeout(timeoutId);

            // Check for proxy-specific errors
            const proxyErrorInfo = handleProxyError(fetchError, "verification");
            if (proxyErrorInfo.isProxyError) {
                // Log proxy error for monitoring
                console.error("[Fixie Proxy] Proxy error in verification:", proxyErrorInfo.message);
                return createErrorResponse(
                    "Service temporarily unavailable. Please try again later.",
                    503
                );
            }

            if (axios.isAxiosError(fetchError)) {
                const status = fetchError.response?.status || 500;
                const errorData = fetchError.response?.data || fetchError.message;

                console.error(`[Aadhaar Verify] Upstream Error (${status}):`, JSON.stringify(errorData));

                if (status === 401 || status === 403) {
                    return createErrorResponse(
                        `Verification service access denied. Check API credentials or IP Whitelist. Upstream: ${JSON.stringify(errorData)}`,
                        500
                    );
                }

                if (status === 400) {
                    return createErrorResponse(
                        typeof errorData === "object" ? JSON.stringify(errorData) : String(errorData),
                        400
                    );
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
    } catch (err: unknown) {
        return handleRouteError(err, "POST /api/verification");
    }
}
