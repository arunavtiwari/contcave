import getCurrentUser from "@/app/actions/getCurrentUser";
import { createErrorResponse, createSuccessResponse, handleRouteError, readJsonObject } from "@/lib/api-utils";
import { ListingService } from "@/lib/listing/service";

interface IParams { listingId?: string }

/**
 * Enterprise-grade PATCH /api/listings/[listingId]
 */
export async function PATCH(request: Request, props: { params: Promise<IParams> }) {
  try {
    const { listingId } = await props.params;
    const currentUser = await getCurrentUser();

    if (!currentUser?.id) {
      return createErrorResponse("Authentication required", 401);
    }

    if (!listingId || typeof listingId !== "string") {
      return createErrorResponse("Invalid listing ID", 400);
    }

    const parsedBody = await readJsonObject(request, 1_000_000);
    if (!parsedBody.success) return parsedBody.response;
    const body = parsedBody.data;

    // Logic centralized in ListingService
    const updated = await ListingService.updateListing(currentUser.id, listingId, body);

    return createSuccessResponse(updated);
  } catch (error) {
    if (error instanceof Error && (error.message.includes("Permission") || error.message.includes("not found"))) {
      return createErrorResponse(error.message, 403);
    }
    return handleRouteError(error, "PATCH /api/listings/[listingId]");
  }
}

/**
 * Enterprise-grade DELETE /api/listings/[listingId]
 */
export async function DELETE(request: Request, props: { params: Promise<IParams> }) {
  try {
    const { listingId } = await props.params;
    const currentUser = await getCurrentUser();

    if (!currentUser?.id) {
      return createErrorResponse("Authentication required", 401);
    }

    if (!listingId || typeof listingId !== "string") {
      return createErrorResponse("Invalid listing ID", 400);
    }

    await ListingService.deleteListing(currentUser.id, listingId);

    return createSuccessResponse({ message: "Listing deleted successfully" });
  } catch (error) {
    return handleRouteError(error, "DELETE /api/listings/[listingId]");
  }
}

export const runtime = "nodejs";
