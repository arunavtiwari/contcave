import { addDays } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

import prisma from "@/lib/prismadb";
import { WhatsappService } from "@/lib/whatsapp/service";

export async function sendBookingReminders() {
    // Determine 'tomorrow' dynamically in IST
    const tomorrowStr = formatInTimeZone(addDays(new Date(), 1), "Asia/Kolkata", "yyyy-MM-dd");
    const start = new Date(`${tomorrowStr}T00:00:00.000Z`);
    const end = new Date(`${tomorrowStr}T23:59:59.999Z`);

    console.warn('[Cron] Running booking reminders (IST-aligned)', { tomorrowStr, rangeStart: start.toISOString(), rangeEnd: end.toISOString() });

    const reservations = await prisma.reservation.findMany({
        where: {
            startDate: {
                gte: start,
                lte: end,
            },
            Transaction: {
                some: {
                    status: "SUCCESS",
                },
            },
            reminderSent: false,
        },
        include: {
            user: true,
            listing: true,
        },
    });

    console.warn('[Cron] Found reservations for tomorrow', { count: reservations.length });

    interface ReminderResult {
        id: string;
        status: string;
        phone?: string;
        error?: string;
        reason?: string;
    }

    const results: ReminderResult[] = [];

    // Process in chunks of 15 to balance Meta rate limits and prevent Vercel Serverless timeouts
    const CHUNK_SIZE = 15;
    for (let i = 0; i < reservations.length; i += CHUNK_SIZE) {
        const chunk = reservations.slice(i, i + CHUNK_SIZE);

        await Promise.allSettled(chunk.map(async (res) => {
            if (res.user?.phone) {
                try {
                    await WhatsappService.sendBookingReminderCustomer(res.user.phone, {
                        customerName: res.user.name || "Customer",
                        listingTitle: res.listing.title,
                        startTime: res.endTime ? `${res.startTime} to ${res.endTime}` : res.startTime,
                        idempotencyKey: `reminder_${res.id}`,
                    });

                    // Persist state to DB to guarantee exactly-once execution across retries
                    await prisma.reservation.update({
                        where: { id: res.id },
                        data: { reminderSent: true }
                    });

                    results.push({ id: res.id, status: "sent", phone: res.user.phone });
                } catch (error: unknown) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    console.error(`Failed to send reminder for reservation ${res.id}`, { error: errorMessage });
                    results.push({ id: res.id, status: "failed", error: errorMessage });
                }
            } else {
                results.push({ id: res.id, status: "skipped", reason: "no_phone" });
            }
        }));
    }

    return results;
}
