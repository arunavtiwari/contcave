import { NextRequest } from "next/server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";
import prisma from "@/lib/prismadb";

export async function POST(request: NextRequest) {
  try {
    if (!request.headers.get("content-type")?.includes("application/json")) {
      return createErrorResponse("Content-Type must be application/json", 415);
    }

    const currentUser = await getCurrentUser();
    if (!currentUser?.id) {
      return createErrorResponse("Unauthorized", 401);
    }

    if (!currentUser.is_owner) {
      return createErrorResponse("Only owners can create addons", 403);
    }

    const body = await request.json().catch(() => ({}));
    const { name, price, image } = body;

    if (!name || typeof name !== "string") {
      return createErrorResponse("name is required and must be a string", 400);
    }

    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      return createErrorResponse("name must be at least 2 characters long", 400);
    }
    if (trimmedName.length > 200) {
      return createErrorResponse("name is too long (max 200 characters)", 400);
    }

    if (price == null || typeof price !== "number" || !Number.isFinite(price)) {
      return createErrorResponse("price is required and must be a number", 400);
    }

    const priceValue = Math.round(Number(price));
    if (priceValue < 0) {
      return createErrorResponse("price must be non-negative", 400);
    }
    if (priceValue > 1000000) {
      return createErrorResponse("price exceeds maximum limit (₹1,000,000)", 400);
    }

    if (!image || typeof image !== "string") {
      return createErrorResponse("image is required and must be a string", 400);
    }

    const trimmedImage = image.trim();
    if (trimmedImage.length === 0) {
      return createErrorResponse("image URL cannot be empty", 400);
    }
    if (trimmedImage.length > 500) {
      return createErrorResponse("image URL is too long (max 500 characters)", 400);
    }
    if (!trimmedImage.startsWith("http://") && !trimmedImage.startsWith("https://")) {
      return createErrorResponse("image must be a valid HTTP/HTTPS URL", 400);
    }

    const existing = await prisma.addons.findFirst({
      where: { name: trimmedName },
      select: { id: true },
    });

    if (existing) {
      return createErrorResponse("An addon with this name already exists", 409);
    }

    const addon = await prisma.addons.create({
      data: {
        name: trimmedName,
        price: priceValue,
        image: trimmedImage,
      },
    });

    return createSuccessResponse(addon, 201);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return createErrorResponse("An addon with this name already exists", 409);
    }
    return handleRouteError(error, "POST /api/paidaddons");
  }
}
