import prisma from "@/lib/prismadb";
import getCurrentUser from "@/app/actions/getCurrentUser";
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";

interface IParams {
  amenityId?: string;
}

export async function DELETE(request: Request, props: { params: Promise<IParams> }) {
  try {
    const params = await props.params;
    const currentUser = await getCurrentUser();

    if (!currentUser?.id) {
      return createErrorResponse("Unauthorized", 401);
    }

    if (!currentUser.is_owner && !currentUser.is_verified) {
      return createErrorResponse("Only verified owners can delete amenities", 403);
    }

    const { amenityId } = params;

    if (!amenityId || typeof amenityId !== "string" || amenityId.trim().length === 0) {
      return createErrorResponse("Invalid amenity ID", 400);
    }

    const amenity = await prisma.amenities.findUnique({
      where: { id: amenityId },
      select: { id: true },
    });

    if (!amenity) {
      return createErrorResponse("Amenity not found", 404);
    }

    await prisma.amenities.delete({
      where: {
        id: amenityId,
      },
    });

    return createSuccessResponse({ id: amenityId, deleted: true }, 200, "Amenity deleted successfully");
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2025") {
      return createErrorResponse("Amenity not found", 404);
    }
    return handleRouteError(error, "DELETE /api/amenities/[amenityId]");
  }
}
