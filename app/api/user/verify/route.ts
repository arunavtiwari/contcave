import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/lib/prismadb";
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";

export async function PATCH(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser)
      return createErrorResponse("Unauthorized", 401);

    let body;
    try {
      body = await request.json();
    } catch {
      return createErrorResponse("Invalid JSON", 400);
    }

    const { step, phone, aadhaarRefId, bankVerifiedName } = body;

    const updates: Record<string, unknown> = {};

    if (step === "email") {
      updates.email_verified = true;
      updates.verified_via = { push: "email_verification_msg91" };
    }

    if (step === "phone") {
      updates.phone_verified = true;
      if (phone) updates.phone = phone;
      updates.verified_via = { push: "phone_otp" };
    }

    if (step === "aadhaar") {
      updates.aadhaar_verified = true;
      updates.aadhaar_ref_id = aadhaarRefId;
      updates.verified_via = { push: "aadhaar_okyc" };
    }

    if (step === "bank") {
      updates.bank_verified = true;
      if (bankVerifiedName) updates.bank_verified_name = bankVerifiedName;
      updates.verified_via = { push: "bank_verification" };
    }

    updates.verification_stage = { increment: 1 };

    const updated = await prisma.user.update({
      where: { id: currentUser.id },
      data: updates,
    });

    // Final check: mark fully verified if all steps done
    if (
      updated.phone_verified &&
      updated.email_verified &&
      updated.aadhaar_verified &&
      updated.bank_verified
    ) {
      await prisma.user.update({
        where: { id: currentUser.id },
        data: { is_verified: true, verified_at: new Date() },
      });
    }

    return createSuccessResponse(updated);
  } catch (err) {
    return handleRouteError(err, "PATCH /api/user/verify");
  }
}
