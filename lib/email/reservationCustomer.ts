import { AttachmentInput, sendTemplateEmail } from "./mailer";

export async function sendReservationCustomerEmail(input: {
    toEmail: string;
    toName?: string;
    studioName: string;
    startDate: string;
    startTime: string;
    endTime: string;
    totalPrice: number;
    addons: string;
    studioLocation: string;
    additionalInfo?: string;
    setNames?: string;
    packageTitle?: string | null;
    templateId?: string;
    attachments?: AttachmentInput[];
}) {
    await sendTemplateEmail({
        toEmail: input.toEmail,
        toName: input.toName || "",
        templateId: input.templateId || process.env.MS_TPL_RESERVATION_CUSTOMER || "",
        data: {
            customer_name: input.toName || "",
            studio_name: input.studioName,
            start_date: input.startDate,
            start_time: input.startTime,
            end_time: input.endTime,
            total_price: Math.round(input.totalPrice),
            addons: input.addons,
            studio_location: input.studioLocation,
            additional_info: input.additionalInfo || "",
            set_names: input.setNames || "",
            package_title: input.packageTitle || "",
        },
        attachments: input.attachments,
    });
}
