import getCurrentUser from "@/app/actions/getCurrentUser";
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";
import { ListingService } from "@/lib/listing/service";

/**
 * Enterprise-grade POST /api/listings
 * Defers to ListingService for all domain logic and transactional persistence.
 */
export async function POST(request: Request) {
  try {
    if (!request.headers.get("content-type")?.includes("application/json")) {
      return createErrorResponse("Content-Type must be application/json", 415);
    }

    const currentUser = await getCurrentUser();
    if (!currentUser?.id) {
      return createErrorResponse("Authentication required", 401);
    }

    if (!currentUser.is_owner) {
      return createErrorResponse("Only owners can create listings", 403);
    }

    const body = await request.json().catch(() => ({}));

    // Logic centralized in ListingService
    const listing = await ListingService.createListing(currentUser.id, body);

    return createSuccessResponse(listing, 201, "Listing created successfully");
  } catch (error) {
    // Service-level errors are handled as 400 Bad Request
    if (error instanceof Error && (error.message.includes("is required") || error.message.includes("too long") || error.message.includes("too short"))) {
      return createErrorResponse(error.message, 400);
    }
    return handleRouteError(error, "POST /api/listings");
  }
}

export const dynamic = "force-dynamic";
