import { NextRequest } from "next/server";

import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";
import { hasValidCronSecret } from "@/lib/cron/auth";
import { getUnverifiedBookings } from "@/lib/maintenance/postBooking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    if (!hasValidCronSecret(req)) {
      return createErrorResponse("Unauthorized", 401);
    }

    const bookings = await getUnverifiedBookings();
    return createSuccessResponse({ total: bookings.length, bookings });
  } catch (error) {
    return handleRouteError(error, "GET /api/cron/unverified-bookings");
  }
}
