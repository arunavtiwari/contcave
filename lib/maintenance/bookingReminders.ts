import { addDays } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

import prisma from "@/lib/prismadb";
import { ReservationService } from "@/lib/reservation/service";
import { WhatsappService } from "@/lib/whatsapp/service";

export async function sendBookingReminderForReservation(reservationId: string) {
    const reservation = await prisma.reservation.findFirst({
        where: {
            id: reservationId,
            status: "CONFIRMED",
            reminderSent: false,
            markedForDeletion: false,
        },
        include: { user: true, listing: true },
    });
    if (!reservation) return { id: reservationId, status: "skipped" } as const;
    if (!reservation.user.phone) return { id: reservationId, status: "skipped" } as const;

    await WhatsappService.sendBookingReminderCustomer(reservation.user.phone, {
        customerName: reservation.user.name || "Customer",
        listingTitle: reservation.listing.title,
        startTime: `${reservation.startTime} to ${reservation.endTime}`,
        idempotencyKey: `reminder_${reservation.id}`,
    });
    await prisma.reservation.updateMany({ where: { id: reservation.id, reminderSent: false }, data: { reminderSent: true } });
    return { id: reservation.id, status: "sent" } as const;
}

export async function sendBookingReminders() {
    const tomorrowStr = formatInTimeZone(addDays(new Date(), 1), "Asia/Kolkata", "yyyy-MM-dd");
    const start = new Date(`${tomorrowStr}T00:00:00.000Z`);
    const end = new Date(`${tomorrowStr}T23:59:59.999Z`);

    console.warn('[Maintenance] Running booking reminders (IST-aligned)', { tomorrowStr });

    return await ReservationService.sendReminders(start, end);
}
