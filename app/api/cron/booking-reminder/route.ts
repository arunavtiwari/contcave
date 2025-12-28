import { sendBookingReminders } from "@/lib/cron/sendBookingReminders";
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const results = await sendBookingReminders();
        return createSuccessResponse({ success: true, results });
    } catch (error) {
        return handleRouteError(error, "GET /api/cron/booking-reminder");
    }
}
