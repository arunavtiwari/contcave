import { NextRequest } from "next/server";

import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";
import { ReservationService } from "@/lib/reservation/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const cronSecret = req.headers.get("x-github-secret");
    const expectedSecret = process.env.CRON_SECRET;

    if (!expectedSecret || cronSecret !== expectedSecret) {
      return createErrorResponse("Unauthorized", 401);
    }

    const results = await ReservationService.expirePendingApprovalReservations();
    return createSuccessResponse({ success: true, results });
  } catch (error) {
    return handleRouteError(error, "GET /api/cron/pending-approval-expiry");
  }
}
