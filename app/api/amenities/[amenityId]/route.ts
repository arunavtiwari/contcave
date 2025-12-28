import prisma from "@/lib/prismadb";
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";

interface IParams {
  amenityId?: string;
}

export async function DELETE(request: Request, props: { params: Promise<IParams> }) {
  try {
    const params = await props.params;
    const { amenityId } = params;

    if (!amenityId || typeof amenityId !== "string") {
      return createErrorResponse("Invalid Id", 400);
    }

    const listing = await prisma.listing.delete({
      where: {
        id: amenityId,
      },
    });

    return createSuccessResponse(listing);
  } catch (error) {
    return handleRouteError(error, "DELETE /api/amenities/[amenityId]");
  }
}
