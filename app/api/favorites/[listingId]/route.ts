import getCurrentUser from "@/app/actions/getCurrentUser";
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";
import { UserService } from "@/lib/user/service";

type RouteParams = { listingId: string };

export async function POST(request: Request, props: { params: Promise<RouteParams> }) {
  try {
    const params = await props.params;
    const currentUser = await getCurrentUser();

    if (!currentUser?.id) {
      return createErrorResponse("Authentication required", 401);
    }

    const { listingId } = params;

    if (!listingId || typeof listingId !== "string" || listingId.trim().length === 0) {
      return createErrorResponse("Invalid listing ID", 400);
    }

    try {
      const user = await UserService.toggleFavorite(currentUser.id, listingId);
      return createSuccessResponse(user, 200, "Listing added to favorites");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to toggle favorite";
      return createErrorResponse(message, 400);
    }
  } catch (error) {
    return handleRouteError(error, "POST /api/favorites/[listingId]");
  }
}

export async function DELETE(request: Request, props: { params: Promise<RouteParams> }) {
  try {
    const params = await props.params;
    const currentUser = await getCurrentUser();

    if (!currentUser?.id) {
      return createErrorResponse("Authentication required", 401);
    }

    const { listingId } = params;

    if (!listingId || typeof listingId !== "string" || listingId.trim().length === 0) {
      return createErrorResponse("Invalid listing ID", 400);
    }

    try {
      const user = await UserService.toggleFavorite(currentUser.id, listingId);
      return createSuccessResponse(user, 200, "Listing removed from favorites");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to toggle favorite";
      return createErrorResponse(message, 400);
    }
  } catch (error) {
    return handleRouteError(error, "DELETE /api/favorites/[listingId]");
  }
}
