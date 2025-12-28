import prisma from "@/lib/prismadb";
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";

interface IParams {
  listingId?: string;
}

export async function GET(request: Request, props: { params: Promise<IParams> }) {
  try {
    const params = await props.params;

    const { listingId } = params;

    if (!listingId || typeof listingId !== "string") {
      return createErrorResponse("Invalid Listing Id", 400);
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
    });

    return createSuccessResponse(reviews);
  } catch (error) {
    return handleRouteError(error, "GET /api/reviews/[list]/[listingId]");
  }
}
