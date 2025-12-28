import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/lib/prismadb";
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";

export async function PATCH(request: Request) {
  try {
    if (!request.headers.get("content-type")?.includes("application/json")) {
      return createErrorResponse("Content-Type must be application/json", 415);
    }

    const currentUser = await getCurrentUser();
    if (!currentUser?.id) {
      return createErrorResponse("Unauthorized", 401);
    }

    const body = await request.json().catch(() => ({}));
    const { step, phone, aadhaarRefId, bankVerifiedName } = body;

    if (!step || typeof step !== "string") {
      return createErrorResponse("step is required and must be a string", 400);
    }

    const validSteps = new Set(["email", "phone", "aadhaar", "bank"]);
    if (!validSteps.has(step)) {
      return createErrorResponse("Invalid step. Must be one of: email, phone, aadhaar, bank", 400);
    }

    const updates: Record<string, unknown> = {};

    if (step === "email") {
      updates.email_verified = true;
      updates.verified_via = { push: "email_verification_msg91" };
    }

    if (step === "phone") {
      updates.phone_verified = true;
      if (phone && typeof phone === "string") {
        const digits = phone.replace(/\D/g, "");
        const normalized = digits.startsWith("91") && digits.length === 12 ? digits.slice(2) : digits;
        if (normalized.length === 10) {
          updates.phone = normalized;
        }
      }
      updates.verified_via = { push: "phone_otp" };
    }

    if (step === "aadhaar") {
      if (!aadhaarRefId || typeof aadhaarRefId !== "string" || aadhaarRefId.trim().length === 0) {
        return createErrorResponse("aadhaarRefId is required for aadhaar verification", 400);
      }
      updates.aadhaar_verified = true;
      updates.aadhaar_ref_id = aadhaarRefId.trim();
      updates.verified_via = { push: "aadhaar_okyc" };
    }

    if (step === "bank") {
      updates.bank_verified = true;
      if (bankVerifiedName && typeof bankVerifiedName === "string") {
        const trimmed = bankVerifiedName.trim();
        if (trimmed.length > 0 && trimmed.length <= 200) {
          updates.bank_verified_name = trimmed;
        }
      }
      updates.verified_via = { push: "bank_verification" };
    }

    updates.verification_stage = { increment: 1 };

    const updated = await prisma.user.update({
      where: { id: currentUser.id },
      data: updates,
      select: {
        id: true,
        phone_verified: true,
        email_verified: true,
        aadhaar_verified: true,
        bank_verified: true,
        is_verified: true,
        verification_stage: true,
      },
    });

    if (
      updated.phone_verified &&
      updated.email_verified &&
      updated.aadhaar_verified &&
      updated.bank_verified &&
      !updated.is_verified
    ) {
      await prisma.user.update({
        where: { id: currentUser.id },
        data: { is_verified: true, verified_at: new Date() },
      }).catch(() => {});
    }

    return createSuccessResponse(updated);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2025") {
      return createErrorResponse("User not found", 404);
    }
    return handleRouteError(error, "PATCH /api/user/verify");
  }
}
