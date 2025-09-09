// lib/email/reservationOwner.ts
import { sendTemplateEmail } from "./mailer";

export async function sendReservationOwnerEmail(input: {
    toEmail: string;
    toName?: string;
    studioName: string;
    startDate: string;
    startTime: string;
    endTime: string;
    totalPrice: number;
    customerName: string;
    templateId?: string;
}) {
    await sendTemplateEmail({
        toEmail: input.toEmail,
        toName: input.toName || "",
        templateId: input.templateId || process.env.MS_TPL_RESERVATION_OWNER || "",
        data: {
            owner_name: input.toName || "",
            studio_name: input.studioName,
            start_date: input.startDate,
            start_time: input.startTime,
            end_time: input.endTime,
            total_price: Math.round(input.totalPrice),
            customer_name: input.customerName || "",
        },
    });
}
