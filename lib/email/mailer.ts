import { Attachment,EmailParams, MailerSend, Recipient, Sender } from "mailersend";

export type PersonalizationData = Record<string, string | number | boolean | null | undefined>;

export type AttachmentInput = {
    filename: string;
    content: string; // base64
    disposition?: string;
};

export async function sendTemplateEmail({
    toEmail,
    toName = "",
    templateId,
    data = {},
    fromEmail = process.env.MAILERSEND_FROM_EMAIL || "",
    fromName = process.env.MAILERSEND_FROM_NAME || "ContCave",
    apiKey = process.env.MAILERSEND_API_KEY || "",
    attachments,
}: {
    toEmail: string;
    toName?: string;
    templateId: string;
    data?: PersonalizationData;
    fromEmail?: string;
    fromName?: string;
    apiKey?: string;
    attachments?: AttachmentInput[];
}) {
    if (!apiKey || !templateId || !toEmail) return;
    const ms = new MailerSend({ apiKey });
    const params = new EmailParams()
        .setTo([new Recipient(toEmail, toName)])
        .setTemplateId(templateId)
        .setPersonalization([{ email: toEmail, data }]);
    if (fromEmail) params.setFrom(new Sender(fromEmail, fromName));
    if (attachments?.length) {
        const mapped = attachments
            .filter((att) => att.content && att.filename)
            .map((att) => new Attachment(att.content, att.filename, att.disposition));
        if (mapped.length) {
            params.setAttachments(mapped);
        }
    }
    await ms.email.send(params);
}
