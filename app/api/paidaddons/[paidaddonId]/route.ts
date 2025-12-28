import prisma from "@/lib/prismadb";
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";

interface IParams {
  paidaddonId?: string;
}

export async function DELETE(request: Request, props: { params: Promise<IParams> }) {
  try {
    const params = await props.params;
    const { paidaddonId } = params;

    if (!paidaddonId || typeof paidaddonId !== "string") {
      return createErrorResponse("Invalid Id", 400);
    }

    const listing = await prisma.listing.deleteMany({
      where: {
        id: paidaddonId,
      },
    });

    return createSuccessResponse(listing);
  } catch (error) {
    return handleRouteError(error, "DELETE /api/paidaddons/[paidaddonId]");
  }
}
