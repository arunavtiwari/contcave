import getCurrentUser from "@/app/actions/getCurrentUser";
import { createErrorResponse, createKnownErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";
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

    if (!listingId || !/^[a-f\d]{24}$/i.test(listingId)) {
      return createErrorResponse("Invalid listing ID", 400);
    }

    try {
      const user = await UserService.setFavorite(currentUser.id, listingId, true);
      return createSuccessResponse({
        favoriteIds: user.favoriteIds,
        isFavorite: user.favoriteIds.includes(listingId),
      }, 200, "Listing added to favorites");
    } catch (error) {
      const knownResponse = createKnownErrorResponse(error);
      if (knownResponse) return knownResponse;
      throw error;
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

    if (!listingId || !/^[a-f\d]{24}$/i.test(listingId)) {
      return createErrorResponse("Invalid listing ID", 400);
    }

    try {
      const user = await UserService.setFavorite(currentUser.id, listingId, false);
      return createSuccessResponse({
        favoriteIds: user.favoriteIds,
        isFavorite: user.favoriteIds.includes(listingId),
      }, 200, "Listing removed from favorites");
    } catch (error) {
      const knownResponse = createKnownErrorResponse(error);
      if (knownResponse) return knownResponse;
      throw error;
    }
  } catch (error) {
    return handleRouteError(error, "DELETE /api/favorites/[listingId]");
  }
}
