import { NextRequest } from "next/server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";
import prisma from "@/lib/prismadb";

function validateDate(dateString: string): Date | null {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return null;
  }
  return date;
}

function validateTime(timeString: string | null | undefined): boolean {
  if (!timeString || typeof timeString !== "string") {
    return false;
  }
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(timeString.trim());
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const listingId = searchParams.get("listingId");
    const date = searchParams.get("date");

    if (!listingId || typeof listingId !== "string" || listingId.trim().length === 0) {
      return createErrorResponse("listingId parameter is required and must be a non-empty string", 400);
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
      select: { id: true },
    });

    if (!listing) {
      return createErrorResponse("Listing not found", 404);
    }

    const dayStatus = await prisma.dayStatus.findUnique({
      where: { listingId_date: { listingId, date: parsedDate } },
    });

    return createSuccessResponse(dayStatus || null);
  } catch (error) {
    return handleRouteError(error, "GET /api/dayStatus");
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!request.headers.get("content-type")?.includes("application/json")) {
      return createErrorResponse("Content-Type must be application/json", 415);
    }

    const currentUser = await getCurrentUser();
    if (!currentUser?.id) {
      return createErrorResponse("Unauthorized", 401);
    }

    const body = await request.json().catch(() => ({}));
    const { listingId, date, listingActive, startTime, endTime } = body;

    if (!listingId || typeof listingId !== "string" || listingId.trim().length === 0) {
      return createErrorResponse("listingId is required and must be a non-empty string", 400);
    }

    if (!date || typeof date !== "string") {
      return createErrorResponse("date is required and must be a string", 400);
    }

    const parsedDate = validateDate(date);
    if (!parsedDate) {
      return createErrorResponse("Invalid date format. Expected ISO date string", 400);
    }

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { userId: true },
    });

    if (!listing) {
      return createErrorResponse("Listing not found", 404);
    }

    if (listing.userId !== currentUser.id) {
      return createErrorResponse("You don't have permission to update this listing's day status", 403);
    }

    if (typeof listingActive !== "boolean") {
      return createErrorResponse("listingActive must be a boolean", 400);
    }

    if (startTime !== null && startTime !== undefined && !validateTime(startTime)) {
      return createErrorResponse("startTime must be in HH:MM format (24-hour) or null", 400);
    }

    if (endTime !== null && endTime !== undefined && !validateTime(endTime)) {
      return createErrorResponse("endTime must be in HH:MM format (24-hour) or null", 400);
    }

    if (startTime && endTime && startTime >= endTime) {
      return createErrorResponse("endTime must be after startTime", 400);
    }

    const dayStatus = await prisma.dayStatus.upsert({
      where: {
        listingId_date: { listingId, date: parsedDate },
      },
      update: {
        listingActive,
        startTime: startTime?.trim() || null,
        endTime: endTime?.trim() || null,
      },
      create: {
        listingId,
        date: parsedDate,
        listingActive,
        startTime: startTime?.trim() || null,
        endTime: endTime?.trim() || null,
      },
    });

    return createSuccessResponse(dayStatus);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return createErrorResponse("Day status already exists for this listing and date", 409);
    }
    return handleRouteError(error, "POST /api/dayStatus");
  }
}
