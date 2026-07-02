import { Attachment, EmailParams, MailerSend, Recipient, Sender } from "mailersend";

export type AttachmentInput = {
    filename: string;
    content: string;
    disposition?: string;
};


type SendEmailInput = {
    toEmail: string;
    toName?: string;
    subject: string;
    html: string;
    text?: string;
    fromEmail?: string;
    fromName?: string;
    apiKey?: string;
    attachments?: AttachmentInput[];
};

export async function sendEmail({
    toEmail,
    toName = "",
    subject,
    html,
    text,
    fromEmail = process.env.MAILERSEND_FROM_EMAIL || "",
    fromName = process.env.MAILERSEND_FROM_NAME || "ContCave",
    apiKey = process.env.MAILERSEND_API_KEY || "",
    attachments,
}: SendEmailInput) {
    if (process.env.E2E_DISABLE_EMAIL_SEND === "true") {
        return;
    }

    if (!apiKey || !toEmail) return;

    const ms = new MailerSend({ apiKey });

    const params = new EmailParams()
        .setTo([new Recipient(toEmail, toName)])
        .setSubject(subject)
        .setHtml(html);

    if (text) {
        params.setText(text);
    }

    if (fromEmail) {
        params.setFrom(new Sender(fromEmail, fromName));
    }

    if (attachments?.length) {
        params.setAttachments(
            attachments.map(
                (att) =>
                    new Attachment(att.content, att.filename, att.disposition)
            )
        );
    }

    await ms.email.send(params);
}
