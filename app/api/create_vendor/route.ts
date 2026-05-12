import { NextRequest } from "next/server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";
import { VerificationService } from "@/lib/verification/service";


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

    const data = await VerificationService.createVendor(currentUser.id, {
      vendor_id: vendor_id.trim(),
      display_name: display_name.trim(),
      email: body.email,
      phone: body.phone,
      account_holder: account_holder.trim(),
      account_number: cleanedAccountNumber,
      ifsc: upperIfsc,
      gstin: body.gstin,
    });

    return createSuccessResponse(data);
  } catch (err: unknown) {
    return handleRouteError(err, "POST /api/create_vendor");
  }
}
