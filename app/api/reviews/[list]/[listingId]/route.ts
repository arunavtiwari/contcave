import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";
import prisma from "@/lib/prismadb";

interface IParams {
  listingId?: string;
}

export async function GET(request: Request, props: { params: Promise<IParams> }) {
  try {
    const params = await props.params;

    const { listingId } = params;

    if (!listingId || typeof listingId !== "string" || listingId.trim().length === 0) {
      return createErrorResponse("Invalid Listing Id", 400);
    }

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true },
    });

    if (!listing) {
      return createErrorResponse("Listing not found", 404);
    }

    const reviews = await prisma.review.findMany({
      where: {
        listingId: listingId,
      },
      include: {
        user: {
          select: {
            name: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    });

    return createSuccessResponse(reviews);
  } catch (error) {
    return handleRouteError(error, "GET /api/reviews/[list]/[listingId]");
  }
}
