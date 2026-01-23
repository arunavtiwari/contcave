// lib/email/reservationOwner.ts
import { AttachmentInput, sendTemplateEmail } from "./mailer";

export async function sendReservationOwnerEmail(input: {
    toEmail: string;
    toName?: string;
    studioName: string;
    startDate: string;
    startTime: string;
    endTime: string;
    totalPrice: number;
    customerName: string;
    setNames?: string;
    packageTitle?: string | null;
    templateId?: string;
    bookingId?: string;
    addons?: string;
    formattedStartDate?: string;
    formattedStartTime?: string;
    formattedEndTime?: string;
    attachments?: AttachmentInput[];
}) {
    await sendTemplateEmail({
        toEmail: input.toEmail,
        toName: input.toName || "",
        templateId: input.templateId || process.env.MS_TPL_RESERVATION_OWNER || "",
        data: {
            studio_owner_name: input.toName || "",
            customer_name: input.customerName || "",
            studio_name: input.studioName,
            bookingId: input.bookingId || "",
            formattedStartDate: input.formattedStartDate || input.startDate,
            formattedStartTime: input.formattedStartTime || input.startTime,
            formattedEndTime: input.formattedEndTime || input.endTime,
            totalPrice: Math.round(input.totalPrice),
            selectedAddonsList: input.addons || "None",
            set_names: input.setNames || "",
            package_title: input.packageTitle || "",
        },
        attachments: input.attachments,
    });
}
