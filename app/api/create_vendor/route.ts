import { NextRequest } from "next/server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { createErrorResponse, createSuccessResponse, handleRouteError, readJsonObject } from "@/lib/api-utils";
import { getClientIp } from "@/lib/http/requestMeta";
import { formatRetryAfterMs, rateLimit } from "@/lib/security/rateLimit";
import { VerificationService } from "@/lib/verification/service";
import { UserRole } from "@/types/user";


export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser?.id) {
      return createErrorResponse("Unauthorized", 401);
    }
    if (currentUser.role !== UserRole.OWNER && currentUser.role !== UserRole.ADMIN) {
      return createErrorResponse("Only owners and administrators can configure payouts", 403);
    }
    const requestLimit = rateLimit({
      key: `create-vendor:${currentUser.id}:${getClientIp(req.headers)}`,
      limit: 5,
      windowMs: 15 * 60_000,
    });
    if (!requestLimit.allowed) {
      const response = createErrorResponse("Too many payout setup attempts. Please wait and try again.", 429);
      response.headers.set("Retry-After", formatRetryAfterMs(requestLimit.resetAt));
      return response;
    }

    const parsedBody = await readJsonObject(req, 10_000);
    if (!parsedBody.success) return parsedBody.response;
    const body = parsedBody.data;

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

    await VerificationService.createVendor(currentUser.id, {
      vendor_id: vendor_id.trim(),
      display_name: display_name.trim(),
      email: body.email,
      phone: body.phone,
      account_holder: account_holder.trim(),
      account_number: cleanedAccountNumber,
      ifsc: upperIfsc,
      gstin: body.gstin,
    });

    return createSuccessResponse({ ensured: true });
  } catch (err: unknown) {
    return handleRouteError(err, "POST /api/create_vendor");
  }
}
