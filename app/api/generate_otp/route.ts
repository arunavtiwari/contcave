import axios from "axios";
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";
import { getFixieProxyAgent, handleProxyError } from "@/lib/fixie-proxy";
import { NextRequest } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";

function validateAadhaarNumber(aadhaar: string): boolean {
  const cleaned = aadhaar.replace(/\D/g, "");
  return cleaned.length === 12 && /^\d{12}$/.test(cleaned);
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
    const { aadhaarNumber } = body;

    if (!aadhaarNumber || typeof aadhaarNumber !== "string") {
      return createErrorResponse("aadhaarNumber is required and must be a string", 400);
    }

    if (!validateAadhaarNumber(aadhaarNumber)) {
      return createErrorResponse("Invalid Aadhaar number format. Must be 12 digits", 400);
    }

    const cleanedAadhaar = aadhaarNumber.replace(/\D/g, "");

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
      
      // Check for proxy-specific errors
      const proxyErrorInfo = handleProxyError(fetchError, "generate_otp");
      if (proxyErrorInfo.isProxyError) {
        // Log proxy error for monitoring
        console.error("[Fixie Proxy] Proxy error in generate_otp:", proxyErrorInfo.message);
        return createErrorResponse(
          "Service temporarily unavailable. Please try again later.",
          503
        );
      }

      if (axios.isAxiosError(fetchError)) {
        const status = fetchError.response?.status || 500;
        const errorData = fetchError.response?.data || fetchError.message;
        
        if (status === 401 || status === 403) {
          return createErrorResponse("Verification service authentication failed", 500);
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
