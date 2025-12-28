import prisma from "@/lib/prismadb";
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name) {
      return createErrorResponse("Name is required", 400);
    }

    const amenity = await prisma.amenities.create({
      data: {
        name
      },
    });

    return createSuccessResponse(amenity);
  } catch (error) {
    return handleRouteError(error, "POST /api/amenities");
  }
}

export async function GET(request: Request) {
  try {
    const amenities = await prisma.amenities.findMany({
      orderBy: {
        createdAt: "asc",
      },
    });
    return createSuccessResponse(amenities);
  } catch (error) {
    return handleRouteError(error, "GET /api/amenities");
  }
}
