import { NextRequest } from "next/server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { createErrorResponse, createSuccessResponse, handleRouteError, readJsonObject } from "@/lib/api-utils";
import prisma from "@/lib/prismadb";
import { dayStatusSchema } from "@/schemas/dayStatus";
import { UserRole } from "@/types/user";

function validateDate(dateString: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return null;
  const date = new Date(`${dateString}T00:00:00.000Z`);
  if (isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== dateString) {
    return null;
  }
  return date;
}

function serializeDayStatus<T extends { date: Date; createdAt: Date; updatedAt: Date }>(value: T) {
  return {
    ...value,
    date: value.date.toISOString(),
    createdAt: value.createdAt.toISOString(),
    updatedAt: value.updatedAt.toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser?.id) return createErrorResponse("Unauthorized", 401);
    if (currentUser.role !== UserRole.OWNER && currentUser.role !== UserRole.ADMIN) {
      return createErrorResponse("Only owners and administrators can view day status", 403);
    }
    const { searchParams } = new URL(request.url);
    const listingId = searchParams.get("listingId");
    const date = searchParams.get("date");

    if (!listingId || !/^[a-f\d]{24}$/i.test(listingId)) {
      return createErrorResponse("A valid listingId parameter is required", 400);
    }

    if (!date || typeof date !== "string") {
      return createErrorResponse("date parameter is required and must be a string", 400);
    }

    const parsedDate = validateDate(date);
    if (!parsedDate) {
      return createErrorResponse("Invalid date format. Expected ISO date string", 400);
    }

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, userId: true },
    });

    if (!listing || (listing.userId !== currentUser.id && currentUser.role !== "ADMIN")) {
      return createErrorResponse("Listing not found", 404);
    }

    const dayStatus = await prisma.dayStatus.findUnique({
      where: { listingId_date: { listingId, date: parsedDate } },
    });

    return createSuccessResponse(dayStatus ? serializeDayStatus(dayStatus) : null);
  } catch (error) {
    return handleRouteError(error, "GET /api/dayStatus");
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser?.id) {
      return createErrorResponse("Unauthorized", 401);
    }
    if (currentUser.role !== UserRole.OWNER && currentUser.role !== UserRole.ADMIN) {
      return createErrorResponse("Only owners and administrators can update day status", 403);
    }

    const parsedBody = await readJsonObject(request, 10_000);
    if (!parsedBody.success) return parsedBody.response;
    const validation = dayStatusSchema.safeParse(parsedBody.data);
    if (!validation.success) {
      return createErrorResponse(validation.error.issues[0].message, 400);
    }

    const { listingId, date, listingActive, startTime, endTime } = validation.data;
    const parsedDate = new Date(date);

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { userId: true, archivedAt: true },
    });

    if (!listing) {
      return createErrorResponse("Listing not found", 404);
    }

    if (listing.userId !== currentUser.id && currentUser.role !== "ADMIN") {
      return createErrorResponse("You don't have permission to update this listing's day status", 403);
    }
    if (listing.archivedAt) {
      return createErrorResponse("Archived listings cannot be modified", 409);
    }

    const dayStatus = await prisma.dayStatus.upsert({
      where: {
        listingId_date: { listingId, date: parsedDate },
      },
      update: {
        listingActive,
        startTime: startTime || "",
        endTime: endTime || "",
      },
      create: {
        listingId,
        date: parsedDate,
        listingActive,
        startTime: startTime || "",
        endTime: endTime || "",
      },
    });

    return createSuccessResponse(serializeDayStatus(dayStatus));
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return createErrorResponse("Day status already exists for this listing and date", 409);
    }
    return handleRouteError(error, "POST /api/dayStatus");
  }
}
