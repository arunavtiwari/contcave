import prisma from "@/lib/prismadb";
import { WhatsappService } from "@/lib/whatsapp/service";
import { addDays, startOfDay, endOfDay } from "date-fns";

export async function sendBookingReminders() {
    const tomorrow = addDays(new Date(), 1);
    const start = startOfDay(tomorrow);
    const end = endOfDay(tomorrow);

    console.warn('[Cron] Running booking reminders', { rangeStart: start.toISOString(), rangeEnd: end.toISOString() });

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

    for (const res of reservations) {
        if (res.user?.phone) {
            try {
                await WhatsappService.sendBookingReminderCustomer(res.user.phone, {
                    customerName: res.user.name || "Customer",
                    listingTitle: res.listing.title,
                    startTime: res.startTime,
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
    }

    return results;
}
