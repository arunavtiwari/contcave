import { sendBookingReminders } from "@/lib/cron/sendBookingReminders";
import { createSuccessResponse, handleRouteError } from "@/lib/api-utils";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const results = await sendBookingReminders();
        return createSuccessResponse({ success: true, results });
    } catch (error) {
        return handleRouteError(error, "GET /api/cron/booking-reminder");
    }
}
