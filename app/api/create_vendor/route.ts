import axios from "axios";
import { NextRequest } from "next/server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";
import { cfSplitBaseURL } from "@/lib/cashfree/cashfree";
// ... (omitting lines to keep it simple, I will use separate chunks if needed, but the tool supports one chunk per call unless multi_replace is used, wait. The valid usage allows replacing a block. I will use multi_replace for safety as lines are far apart)

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

    if (!body || typeof body !== "object") {
      return createErrorResponse("Request body is required and must be an object", 400);
    }

    const { vendor_id, display_name, account_holder, account_number, ifsc } = body;

    if (!vendor_id || typeof vendor_id !== "string" || vendor_id.trim().length === 0) {
      return createErrorResponse("vendor_id is required and must be a non-empty string", 400);
    }

    if (!display_name || typeof display_name !== "string" || display_name.trim().length === 0) {
      return createErrorResponse("display_name is required and must be a non-empty string", 400);
    }

    if (display_name.trim().length > 100) {
      return createErrorResponse("display_name is too long (max 100 characters)", 400);
    }

    if (!account_holder || typeof account_holder !== "string" || account_holder.trim().length === 0) {
      return createErrorResponse("account_holder is required and must be a non-empty string", 400);
    }

    if (account_holder.trim().length > 100) {
      return createErrorResponse("account_holder is too long (max 100 characters)", 400);
    }

    if (!account_number || typeof account_number !== "string") {
      return createErrorResponse("account_number is required and must be a string", 400);
    }

    const cleanedAccountNumber = account_number.replace(/\D/g, "");
    if (cleanedAccountNumber.length < 9 || cleanedAccountNumber.length > 20) {
      return createErrorResponse("account_number must be between 9 and 20 digits", 400);
    }

    if (!ifsc || typeof ifsc !== "string") {
      return createErrorResponse("ifsc is required and must be a string", 400);
    }

    const upperIfsc = ifsc.trim().toUpperCase();
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(upperIfsc)) {
      return createErrorResponse("Invalid IFSC code format. Must be 11 characters (e.g., ABCD0123456)", 400);
    }

    const appId = process.env.CASHFREE_APP_ID;
    const secret = process.env.CASHFREE_SECRET_KEY;

    if (!appId || !secret || typeof appId !== "string" || typeof secret !== "string") {
      return createErrorResponse("Server configuration error", 500);
    }

    const url = `${cfSplitBaseURL()}/vendors`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const resp = await axios.post(
        url,
        {
          ...body,
          vendor_id: vendor_id.trim(),
          display_name: display_name.trim(),
          account_holder: account_holder.trim(),
          account_number: cleanedAccountNumber,
          ifsc: upperIfsc,
        },
        {
          headers: {
            "Content-Type": "application/json",
            "x-client-id": appId,
            "x-client-secret": secret,
            "x-api-version": "2023-08-01",
          },
          signal: controller.signal,
          timeout: 30000,
        }
      );

      clearTimeout(timeoutId);
      return createSuccessResponse(resp.data, resp.status);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (axios.isAxiosError(fetchError)) {
        const status = fetchError.response?.status || 500;
        const errorData = fetchError.response?.data || fetchError.message;

        if (status === 401 || status === 403) {
          console.error(`[Cashfree Vendor] Auth Error (${status}):`, JSON.stringify(errorData));
          return createErrorResponse(
            `Cashfree authentication failed (IP/Creds). Upstream: ${JSON.stringify(errorData)}`,
            500
          );
        }

        if (status === 409) {
          // Vendor likely already exists
          return createErrorResponse(
            typeof errorData === "object" ? (errorData as { message?: string }).message || "Vendor already exists" : String(errorData),
            409
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
    return handleRouteError(err, "POST /api/create_vendor");
  }
}
