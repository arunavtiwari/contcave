import { NextRequest } from "next/server";

import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";
import { hasValidCronSecret } from "@/lib/cron/auth";
import { sendBookingReminders } from "@/lib/maintenance/bookingReminders";
import { assertNoFailedMaintenanceResults } from "@/lib/maintenance/results";

export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        if (!hasValidCronSecret(req)) {
            return createErrorResponse("Unauthorized", 401);
        }

        const results = await sendBookingReminders();
        assertNoFailedMaintenanceResults(results);
        return createSuccessResponse({ success: true, results });
    } catch (error) {
        return handleRouteError(error, "GET /api/cron/booking-reminder");
    }
}
