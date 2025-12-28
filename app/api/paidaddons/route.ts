import prisma from "@/lib/prismadb";
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      price,
      image,
    } = body;

    if (!name || !price || !image) {
      return createErrorResponse("Missing required fields: name, price, or image", 400);
    }

    const listen = await prisma.addons.create({
      data: {
        name,
        price,
        image
      },
    });

    return createSuccessResponse(listen);
  } catch (error) {
    return handleRouteError(error, "POST /api/paidaddons");
  }
}
