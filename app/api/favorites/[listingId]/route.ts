import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/lib/prismadb";
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";
export const dynamic = "force-dynamic";

interface IPrisma {
  listingId?: string;
}

export async function POST(request: Request, props: { params: Promise<IPrisma> }) {
  try {
    const params = await props.params;
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return createErrorResponse("Authentication required", 401);
    }

    const { listingId } = params;

    if (!listingId || typeof listingId !== "string") {
      return createErrorResponse("Invalid listing ID", 400);
    }

    const favoriteIds = [...(currentUser.favoriteIds || [])];
    favoriteIds.push(listingId);

    const user = await prisma.user.update({
      where: {
        id: currentUser.id,
      },
      data: {
        favoriteIds,
      },
    });

    return createSuccessResponse(user, 200, "Listing added to favorites");
  } catch (error) {
    return handleRouteError(error, "POST /api/favorites/[listingId]");
  }
}

export async function DELETE(request: Request, props: { params: Promise<IPrisma> }) {
  try {
    const params = await props.params;
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return createErrorResponse("Authentication required", 401);
    }

    const { listingId } = params;

    if (!listingId || typeof listingId !== "string") {
      return createErrorResponse("Invalid listing ID", 400);
    }

    let favoriteIds = [...(currentUser.favoriteIds || [])];
    favoriteIds = favoriteIds.filter((id) => id !== listingId);

    const user = await prisma.user.update({
      where: {
        id: currentUser.id,
      },
      data: {
        favoriteIds,
      },
    });

    return createSuccessResponse(user, 200, "Listing removed from favorites");
  } catch (error) {
    return handleRouteError(error, "DELETE /api/favorites/[listingId]");
  }
}
