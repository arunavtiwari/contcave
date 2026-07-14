import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";
import prisma from "@/lib/prismadb";

interface IParams {
  listingId?: string;
}

export async function GET(request: Request, props: { params: Promise<IParams> }) {
  try {
    const params = await props.params;

    const { listingId } = params;

    if (!listingId || !/^[a-f\d]{24}$/i.test(listingId)) {
      return createErrorResponse("Invalid Listing Id", 400);
    }

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true },
    });

    if (!listing) {
      return createErrorResponse("Listing not found", 404);
    }

    const url = new URL(request.url);
    const requestedPage = Number(url.searchParams.get("page") || 1);
    const requestedLimit = Number(url.searchParams.get("limit") || 20);
    const page = Number.isFinite(requestedPage) ? Math.max(1, Math.floor(requestedPage)) : 1;
    const limit = Number.isFinite(requestedLimit) ? Math.min(50, Math.max(1, Math.floor(requestedLimit))) : 20;

    const [reviews, total] = await Promise.all([prisma.review.findMany({
      where: {
        listingId: listingId,
      },
      select: {
        id: true,
        listingId: true,
        rating: true,
        comment: true,
        createdAt: true,
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
      skip: (page - 1) * limit,
      take: limit,
    }), prisma.review.count({ where: { listingId } })]);

    return createSuccessResponse({
      reviews: reviews.map((review) => ({
        ...review,
        createdAt: review.createdAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    return handleRouteError(error, "GET /api/reviews/[list]/[listingId]");
  }
}
