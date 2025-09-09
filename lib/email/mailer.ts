import { MailerSend, EmailParams, Sender, Recipient } from "mailersend";

export type PersonalizationData = Record<string, string | number | boolean | null | undefined>;

export async function sendTemplateEmail({
    toEmail,
    toName = "",
    templateId,
    data = {},
    fromEmail = process.env.MAILERSEND_FROM_EMAIL || "",
    fromName = process.env.MAILERSEND_FROM_NAME || "ContCave",
    apiKey = process.env.MAILERSEND_API_KEY || "",
}: {
    toEmail: string;
    toName?: string;
    templateId: string;
    data?: PersonalizationData;
    fromEmail?: string;
    fromName?: string;
    apiKey?: string;
}) {
    if (!apiKey || !templateId || !toEmail) return;
    const ms = new MailerSend({ apiKey });
    const params = new EmailParams()
        .setTo([new Recipient(toEmail, toName)])
        .setTemplateId(templateId)
        .setPersonalization([{ email: toEmail, data }]);
    if (fromEmail) params.setFrom(new Sender(fromEmail, fromName));
    await ms.email.send(params);
}
