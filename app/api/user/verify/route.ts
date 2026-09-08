import getCurrentUser from "@/app/actions/getCurrentUser";
import { createErrorResponse, createSuccessResponse, handleRouteError, readJsonObject } from "@/lib/api-utils";
import { getClientIp } from "@/lib/http/requestMeta";
import { formatRetryAfterMs, rateLimit } from "@/lib/security/rateLimit";
import { VerificationService } from "@/lib/verification/service";
import { UserRole } from "@/types/user";

export async function PATCH(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser?.id) {
      return createErrorResponse("Unauthorized", 401);
    }
    if (currentUser.role !== UserRole.OWNER && currentUser.role !== UserRole.ADMIN) {
      return createErrorResponse("Only owners and administrators can complete host verification", 403);
    }

    const parsedBody = await readJsonObject(request, 5_000);
    if (!parsedBody.success) return parsedBody.response;
    const body = parsedBody.data;
    if (body.step !== "phone") {
      return createErrorResponse("Use the secure bank or Aadhaar verification flow for this step", 400);
    }
    if (typeof body.phone !== "string" || !/^\d{10}$/.test(body.phone.trim())) {
      return createErrorResponse("Phone number must be exactly 10 digits", 400);
    }
    const requestLimit = rateLimit({
      key: `legacy-save-phone:${currentUser.id}:${getClientIp(request.headers)}`,
      limit: 10,
      windowMs: 15 * 60_000,
    });
    if (!requestLimit.allowed) {
      const response = createErrorResponse("Too many verification attempts. Please wait and try again.", 429);
      response.headers.set("Retry-After", formatRetryAfterMs(requestLimit.resetAt));
      return response;
    }

    const updated = await VerificationService.updateStep(currentUser.id, {
      step: "phone",
      phone: body.phone.trim(),
    });
    return createSuccessResponse(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Verification failed";
    if (message === "User not found") return createErrorResponse(message, 404);
    return handleRouteError(error, "PATCH /api/user/verify");
  }
}
