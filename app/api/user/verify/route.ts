import getCurrentUser from "@/app/actions/getCurrentUser";
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";
import { auditService } from "@/lib/security/audit";
import { VerificationService } from "@/lib/verification/service";

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

    if (body.step === "bank") {
      await auditService.logPaymentDetailsAccess(
        currentUser.id,
        "CREATE",
        currentUser.id,
        request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined,
        request.headers.get("user-agent") || undefined,
        { context: "verification_flow" }
      );
    }

    const updated = await VerificationService.updateStep(currentUser.id, body);
    return createSuccessResponse(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Verification failed";
    if (message === "User not found") return createErrorResponse(message, 404);
    return handleRouteError(error, "PATCH /api/user/verify");
  }
}
