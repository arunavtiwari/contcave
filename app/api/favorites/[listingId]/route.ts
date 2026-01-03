import getCurrentUser from "@/app/actions/getCurrentUser";
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";
import prisma from "@/lib/prismadb";
export const dynamic = "force-dynamic";

interface IPrisma {
  listingId?: string;
}

export async function POST(request: Request, props: { params: Promise<IPrisma> }) {
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

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true },
    });

    if (!listing) {
      return createErrorResponse("Listing not found", 404);
    }

    const favoriteIds = Array.isArray(currentUser.favoriteIds) ? [...currentUser.favoriteIds] : [];

    if (favoriteIds.includes(listingId)) {
      return createErrorResponse("Listing is already in favorites", 409);
    }

    if (favoriteIds.length >= 100) {
      return createErrorResponse("Maximum number of favorites (100) reached", 400);
    }

    favoriteIds.push(listingId);

    const user = await prisma.user.update({
      where: {
        id: currentUser.id,
      },
      data: {
        favoriteIds,
      },
      select: {
        id: true,
        favoriteIds: true,
      },
    });

    return createSuccessResponse(user, 200, "Listing added to favorites");
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2025") {
      return createErrorResponse("Listing not found", 404);
    }
    return handleRouteError(error, "POST /api/favorites/[listingId]");
  }
}

export async function DELETE(request: Request, props: { params: Promise<IPrisma> }) {
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

    const favoriteIds = Array.isArray(currentUser.favoriteIds) ? [...currentUser.favoriteIds] : [];

    if (!favoriteIds.includes(listingId)) {
      return createErrorResponse("Listing is not in favorites", 404);
    }

    const updatedFavoriteIds = favoriteIds.filter((id) => id !== listingId);

    const user = await prisma.user.update({
      where: {
        id: currentUser.id,
      },
      data: {
        favoriteIds: updatedFavoriteIds,
      },
      select: {
        id: true,
        favoriteIds: true,
      },
    });

    return createSuccessResponse(user, 200, "Listing removed from favorites");
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2025") {
      return createErrorResponse("User not found", 404);
    }
    return handleRouteError(error, "DELETE /api/favorites/[listingId]");
  }
}
