import { NextRequest } from "next/server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { createErrorResponse, createSuccessResponse, handleRouteError, readJsonObject } from "@/lib/api-utils";
import prisma from "@/lib/prismadb";
import { isOwner } from "@/lib/user/permissions";

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser?.id) {
      return createErrorResponse("Unauthorized", 401);
    }

    if (!isOwner(currentUser.role) || !currentUser.is_verified) {
      return createErrorResponse("Only verified owners can create amenities", 403);
    }

    const parsedBody = await readJsonObject(request, 5_000);
    if (!parsedBody.success) return parsedBody.response;
    const body = parsedBody.data;
    const { name } = body;

    if (!name || typeof name !== "string") {
      return createErrorResponse("name is required and must be a string", 400);
    }

    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      return createErrorResponse("name must be at least 2 characters long", 400);
    }
    if (trimmedName.length > 100) {
      return createErrorResponse("name is too long (max 100 characters)", 400);
    }

    const existing = await prisma.amenities.findFirst({
      where: { name: trimmedName },
      select: { id: true },
    });

    if (existing) {
      return createErrorResponse("An amenity with this name already exists", 409);
    }

    const amenity = await prisma.amenities.create({
      data: {
        name: trimmedName,
      },
    });

    return createSuccessResponse(amenity, 201);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return createErrorResponse("An amenity with this name already exists", 409);
    }
    return handleRouteError(error, "POST /api/amenities");
  }
}

export async function GET() {
  try {
    const amenities = await prisma.amenities.findMany({
      orderBy: {
        createdAt: "asc",
      },
      take: 500,
    });
    return createSuccessResponse(amenities);
  } catch (error) {
    return handleRouteError(error, "GET /api/amenities");
  }
}
