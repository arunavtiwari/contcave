import axios from "axios";
import { NextRequest } from "next/server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";
import { getFixieProxyAgent, handleProxyError } from "@/lib/fixie-proxy";
import { aadhaarSchema } from "@/lib/schemas/verification";

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


    const validation = aadhaarSchema.safeParse(body);
    if (!validation.success) {
      return createErrorResponse(validation.error.issues[0].message, 400);
    }

    const { aadhaarNumber } = validation.data;
    const cleanedAadhaar = aadhaarNumber.replace(/\D/g, "");

    const clientId = process.env.CASHFREE_CLIENT_ID;
    const clientSecret = process.env.CASHFREE_CLIENT_SECRET;

    if (!clientId || !clientSecret || typeof clientId !== "string" || typeof clientSecret !== "string") {
      return createErrorResponse("Server configuration error", 500);
    }


    const httpsAgent = getFixieProxyAgent();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const resp = await axios.post(
        "https://api.cashfree.com/verification/offline-aadhaar/otp",
        { aadhaar_number: cleanedAadhaar },
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


      const proxyErrorInfo = handleProxyError(fetchError, "generate_otp");
      if (proxyErrorInfo.isProxyError) {

        console.error("[Fixie Proxy] Proxy error in generate_otp:", proxyErrorInfo.message);
        return createErrorResponse(
          "Service temporarily unavailable. Please try again later.",
          503
        );
      }

      if (axios.isAxiosError(fetchError)) {
        const status = fetchError.response?.status || 500;
        const errorData = fetchError.response?.data || fetchError.message;

        console.error(`[Aadhaar OTP] Upstream Error (${status}):`, JSON.stringify(errorData));

        if (status === 401 || status === 403) {

          return createErrorResponse(
            `Verification service access denied. Check API credentials or IP Whitelist. Upstream: ${JSON.stringify(errorData)}`,
            500
          );
        }

        if (status === 409) {

          const errorObj = typeof errorData === 'string' ? JSON.parse(errorData) : errorData;
          if (errorObj?.code === 'verification_pending') {
            return createErrorResponse(
              "OTP already generated. Please enter the OTP you received or wait before retrying.",
              409
            );
          }
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
    return handleRouteError(err, "POST /api/generate_otp");
  }
}
