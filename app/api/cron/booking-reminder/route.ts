import { NextRequest } from "next/server";

import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";
import { sendBookingReminders } from "@/lib/cron/sendBookingReminders";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const cronSecret = req.headers.get("x-cron-secret") || req.headers.get("authorization")?.replace("Bearer ", "");
        const expectedSecret = process.env.CRON_SECRET;

        if (expectedSecret && cronSecret !== expectedSecret) {
            return createErrorResponse("Unauthorized", 401);
        }

        const results = await sendBookingReminders();
        return createSuccessResponse({ success: true, results });
    } catch (error) {
        return handleRouteError(error, "GET /api/cron/booking-reminder");
    }
}
