import prisma from "@/lib/prismadb";
import { WhatsappService } from "@/lib/whatsapp/service";
import { addDays, startOfDay, endOfDay } from "date-fns";

export async function sendBookingReminders() {
    const tomorrow = addDays(new Date(), 1);
    const start = startOfDay(tomorrow);
    const end = endOfDay(tomorrow);

    console.log(`Running booking reminders for range: ${start.toISOString()} - ${end.toISOString()}`);

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

    console.log(`Found ${reservations.length} reservations for tomorrow.`);

    const results: Array<{ id: string; status: string; phone?: string; error?: any; reason?: string }> = [];

    for (const res of reservations) {
        if (res.user?.phone) {
            try {
                await WhatsappService.sendBookingReminderCustomer(res.user.phone, {
                    customerName: res.user.name || "Customer",
                    listingTitle: res.listing.title,
                    startTime: res.startTime,
                });
                results.push({ id: res.id, status: "sent", phone: res.user.phone });
            } catch (error: any) {
                console.error(`Failed to send reminder for reservation ${res.id}`, error);
                results.push({ id: res.id, status: "failed", error: error.message });
            }
        } else {
            results.push({ id: res.id, status: "skipped", reason: "no_phone" });
        }
    }

    return results;
}
