import getCurrentUser from "@/app/actions/getCurrentUser";
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";
import { getClientIp } from "@/lib/http/requestMeta";
import { formatRetryAfterMs, rateLimit } from "@/lib/security/rateLimit";
import { VerificationService } from "@/lib/verification/service";
import { UserRole } from "@/types/user";

export const runtime = "nodejs";

const AADHAAR_MULTIPART_MAX_BYTES = 6 * 1024 * 1024;

function verificationErrorStatus(message: string) {
  if (message === "Unauthorized") return 401;
  if (message.includes("too large")) return 413;
  if (message.includes("required") || message.includes("Upload a")) return 400;
  if (message.includes("busy")) return 429;
  if (message.includes("temporarily unavailable")) return 503;
  if (
    message.includes("not an Aadhaar")
    || message.includes("authenticity checks")
    || message.includes("OCR verification failed")
  ) return 422;
  return 500;
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser?.id) return createErrorResponse("Unauthorized", 401);
    if (currentUser.role !== UserRole.OWNER && currentUser.role !== UserRole.ADMIN) {
      return createErrorResponse("Only owners and administrators can complete Aadhaar verification", 403);
    }
    if (currentUser.aadhaar_verified) {
      return createSuccessResponse({ user: currentUser, alreadyVerified: true });
    }
    if (!request.headers.get("content-type")?.includes("multipart/form-data")) {
      return createErrorResponse("Expected multipart/form-data", 415);
    }
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (Number.isFinite(contentLength) && contentLength > AADHAAR_MULTIPART_MAX_BYTES) {
      return createErrorResponse("Aadhaar document is too large. Upload a file up to 5 MB", 413);
    }
    const requestLimit = rateLimit({
      key: `aadhaar-verify:${currentUser.id}:${getClientIp(request.headers)}`,
      limit: 5,
      windowMs: 15 * 60_000,
    });
    if (!requestLimit.allowed) {
      const response = createErrorResponse("Too many verification attempts. Please wait and try again.", 429);
      response.headers.set("Retry-After", formatRetryAfterMs(requestLimit.resetAt));
      return response;
    }

    const formData = await request.formData();
    const file = formData.get("aadhaarDocument");
    if (!(file instanceof File)) return createErrorResponse("Aadhaar document is required", 400);

    const data = await VerificationService.verifyAadhaarOcr(currentUser.id, file);
    return createSuccessResponse(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to verify Aadhaar document";
    const status = verificationErrorStatus(message);

    if (status >= 500) console.error("[Aadhaar Verification] Service unavailable", { message });
    if (status !== 500) return createErrorResponse(message, status);
    return handleRouteError(error, "POST /api/user/verify/aadhaar");
  }
}
