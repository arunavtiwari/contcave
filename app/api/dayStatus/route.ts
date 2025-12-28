import prisma from "@/lib/prismadb";
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";

// GET request to fetch day status by listingId and date
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const listingId = searchParams.get("listingId");
    const date = searchParams.get("date");

    if (!listingId || !date) {
      return createErrorResponse("Missing parameters: listingId or date", 400);
    }

    const parsedDate = new Date(date);

    const dayStatus = await prisma.dayStatus.findUnique({
      where: { listingId_date: { listingId, date: parsedDate } },
    });

    return createSuccessResponse(dayStatus || {});
  } catch (error) {
    return handleRouteError(error, "GET /api/dayStatus");
  }
}

// POST request to save/update day status
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { listingId, date, listingActive, startTime, endTime } = body;

    if (!listingId || !date) {
      return createErrorResponse("Missing parameters: listingId or date", 400);
    }

    const parsedDate = new Date(date);

    // Upsert: Update if exists, create if not
    const dayStatus = await prisma.dayStatus.upsert({
      where: {
        listingId_date: { listingId, date: parsedDate },
      },
      update: { listingActive, startTime, endTime },
      create: {
        listingId,
        date: parsedDate,
        listingActive,
        startTime,
        endTime,
      },
    });

    return createSuccessResponse(dayStatus);
  } catch (error) {
    return handleRouteError(error, "POST /api/dayStatus");
  }
}
