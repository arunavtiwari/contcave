import getCurrentUser from "@/app/actions/getCurrentUser";
import { createErrorResponse, createSuccessResponse, handleRouteError, readJsonObject } from "@/lib/api-utils";
import prisma from "@/lib/prismadb";
import { UserRole } from "@/types/user";

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

    if (currentUser.role !== UserRole.ADMIN) {
      return createErrorResponse("Only administrators can delete default amenities", 403);
    }

    const { amenityId } = params;

    if (!amenityId || !/^[a-f\d]{24}$/i.test(amenityId)) {
      return createErrorResponse("Invalid amenity ID", 400);
    }

    const amenity = await prisma.amenities.findUnique({
      where: { id: amenityId },
      select: { id: true },
    });

    if (!amenity) {
      return createErrorResponse("Amenity not found", 404);
    }

    await prisma.$transaction(async (tx) => {
      const listings = await tx.listing.findMany({
        where: { amenities: { has: amenityId } },
        select: { id: true, amenities: true },
      });
      for (const listing of listings) {
        await tx.listing.update({
          where: { id: listing.id },
          data: { amenities: listing.amenities.filter((id) => id !== amenityId) },
        });
      }
      await tx.amenities.delete({ where: { id: amenityId } });
    });

    return createSuccessResponse({ id: amenityId, deleted: true }, 200, "Amenity deleted successfully");
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2025") {
      return createErrorResponse("Amenity not found", 404);
    }
    return handleRouteError(error, "DELETE /api/amenities/[amenityId]");
  }
}

export async function PATCH(request: Request, props: { params: Promise<IParams> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser?.id) return createErrorResponse("Unauthorized", 401);
    if (currentUser.role !== UserRole.ADMIN) {
      return createErrorResponse("Only administrators can edit default amenities", 403);
    }

    const { amenityId } = await props.params;
    if (!amenityId || !/^[a-f\d]{24}$/i.test(amenityId)) return createErrorResponse("Invalid amenity ID", 400);
    const parsedBody = await readJsonObject(request, 5_000);
    if (!parsedBody.success) return parsedBody.response;
    const name = typeof parsedBody.data.name === "string" ? parsedBody.data.name.trim() : "";
    if (name.length < 2 || name.length > 100) {
      return createErrorResponse("Amenity name must be between 2 and 100 characters", 400);
    }

    const duplicate = await prisma.amenities.findFirst({
      where: { name, id: { not: amenityId } },
      select: { id: true },
    });
    if (duplicate) return createErrorResponse("An amenity with this name already exists", 409);

    const amenity = await prisma.amenities.update({ where: { id: amenityId }, data: { name } });
    return createSuccessResponse(amenity, 200, "Amenity updated successfully");
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return createErrorResponse("An amenity with this name already exists", 409);
    }
    if (error && typeof error === "object" && "code" in error && error.code === "P2025") {
      return createErrorResponse("Amenity not found", 404);
    }
    return handleRouteError(error, "PATCH /api/amenities/[amenityId]");
  }
}
