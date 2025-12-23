import { NextResponse } from "next/server";
import { sendBookingReminders } from "@/lib/cron/sendBookingReminders";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const results = await sendBookingReminders();
        return NextResponse.json({ success: true, results });
    } catch (error: any) {
        console.error("Error in booking-reminder cron:", error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
