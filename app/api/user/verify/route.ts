

import getCurrentUser from "@/app/actions/getCurrentUser";
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";
import { upsertPaymentDetailsSafe } from "@/lib/payment-details";
import { normalizePhone } from "@/lib/phone";
import prisma from "@/lib/prismadb";
import { auditService } from "@/lib/security/audit";

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
    const {
      step,
      phone,
      aadhaarRefId,
      bankVerifiedName,
      vendorId,
      accountNumber,
      ifscCode,
      gstin,
      companyName,
      bankName,
      aadhaarLast4
    } = body;

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
      const normalized = normalizePhone(phone);
      if (normalized) {
        updates.phone = normalized;
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
      if (aadhaarLast4 && typeof aadhaarLast4 === "string") {
        updates.aadhaar_last4 = aadhaarLast4;
      }
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

      if (accountNumber && ifscCode && bankVerifiedName) {
        try {
          const result = await upsertPaymentDetailsSafe({
            userId: currentUser.id,
            accountHolderName: bankVerifiedName.trim(),
            bankName: (bankName && typeof bankName === "string") ? bankName.trim() : "Unknown",
            accountNumber: accountNumber.trim(),
            ifscCode: ifscCode.trim(),
            companyName: (companyName && typeof companyName === "string") ? companyName.trim() : undefined,
            gstin: (gstin && typeof gstin === "string") ? gstin.trim() : undefined,
            cashfreeVendorId: (vendorId && typeof vendorId === "string") ? vendorId.trim() : undefined,
          });

          if (!result.success) {
            throw new Error(result.error || 'Failed to save payment details during verification');
          }

          await auditService.logPaymentDetailsAccess(
            currentUser.id,
            'CREATE',
            currentUser.id,
            request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
            request.headers.get('user-agent') || undefined,
            {
              hasAccountNumber: !!accountNumber,
              hasIfscCode: !!ifscCode,
              hasGstin: !!gstin,
              hasVendorId: !!vendorId,
              context: 'verification_flow'
            }
          );

        } catch (error) {
          console.error('Payment details processing failed during verification:', error);
          throw new Error(`Verification processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    const currentStage = currentUser.verification_stage || 0;

    if (step === "email" || step === "phone") {
      if (currentStage < 1) {
        updates.verification_stage = 1;
      }
    } else if (step === "aadhaar") {
      if (currentStage < 2) {
        updates.verification_stage = 2;
      }
    } else if (step === "bank") {
      if (currentStage < 3) {
        updates.verification_stage = 3;
      }
    }

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
        aadhaar_last4: true,
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
      }).catch(() => { });
    }

    return createSuccessResponse(updated);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2025") {
      return createErrorResponse("User not found", 404);
    }
    return handleRouteError(error, "PATCH /api/user/verify");
  }
}
