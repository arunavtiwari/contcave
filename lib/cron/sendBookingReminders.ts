import { addDays } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

import { ReservationService } from "@/lib/reservation/service";

export async function sendBookingReminders() {
    const tomorrowStr = formatInTimeZone(addDays(new Date(), 1), "Asia/Kolkata", "yyyy-MM-dd");
    const start = new Date(`${tomorrowStr}T00:00:00.000Z`);
    const end = new Date(`${tomorrowStr}T23:59:59.999Z`);

    console.warn('[Cron] Running booking reminders (IST-aligned)', { tomorrowStr });

    return await ReservationService.sendReminders(start, end);
}
