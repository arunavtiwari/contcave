import { getBaseUrl } from "@/lib/utils";

import { AttachmentInput, sendEmail } from "./mailer";

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatInr(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function getReservationEmailHtml(input: {
  greetingName: string;
  intro: string;
  studioName: string;
  startDate: string;
  startTime: string;
  endTime: string;
  totalPrice: number;
  addons?: string | null;
  studioLocation?: string;
  nextSteps?: string[];
}) {
  const hasAddons = Boolean(input.addons?.trim());
  const detailRows = [
    ["Date", input.startDate],
    ["Time", `${input.startTime} - ${input.endTime}`],
    ["Total", formatInr(input.totalPrice)],
    ...(hasAddons ? [["Add-ons", input.addons!]] : []),
    ...(input.studioLocation ? [["Location", input.studioLocation]] : []),
  ];

  return `
  <!DOCTYPE html>
  <html>
  <head><meta charset="UTF-8" /><title>Booking Confirmation</title></head>
  <body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#374151;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table width="100%" style="max-width:560px;background:#ffffff;border-radius:8px;padding:32px;">
            <tr>
              <td style="font-size:15px;line-height:1.6;">
                <p>Hi ${escapeHtml(input.greetingName)},</p>
                <p>${escapeHtml(input.intro)}</p>
                <h2 style="font-size:18px;color:#111827;margin:24px 0 12px;">Booking Details</h2>
                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                  ${detailRows.map(([label, value]) => `
                    <tr>
                      <td style="padding:8px 0;color:#6b7280;width:120px;">${escapeHtml(label)}</td>
                      <td style="padding:8px 0;color:#111827;font-weight:600;">${escapeHtml(value)}</td>
                    </tr>
                  `).join("")}
                </table>
                ${input.nextSteps?.length ? `
                  <h2 style="font-size:18px;color:#111827;margin:24px 0 12px;">Next Steps</h2>
                  <ul style="padding-left:20px;margin:0;">
                    ${input.nextSteps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}
                  </ul>
                ` : ""}
                <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0;" />
                <p style="font-size:13px;color:#9ca3af;line-height:1.6;margin:0;">ContCave by Arkanet Ventures LLP.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;
}

export function getResetPasswordTemplate(name: string, resetUrl: string): string {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8" />
    <title>Reset Your Password</title>
  </head>
  <body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:40px 0;">
          <table width="100%" style="max-width:480px;background:#ffffff;border-radius:8px;padding:32px;">
            <tr>
              <td style="color:#374151;font-size:15px;line-height:1.6;">
                <p>Hi ${name || "there"},</p>
                <p>We received a request to reset your password. Click the button below to choose a new one:</p>
                <div style="text-align:center;margin:32px 0;">
                  <a href="${resetUrl}" 
                     style="background:#000000;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block;">
                    Reset Password
                  </a>
                </div>
                <p style="font-size:14px;color:#6b7280;">If you didn't request this, you can safely ignore this email.</p>
                <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0;" />
                <p style="font-size:13px;color:#9ca3af;margin:0;">ContCave by Arkanet Ventures LLP.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;
}

export function getHostOnboardingTemplate(name: string): string {
  const ctaUrl = `${getBaseUrl()}/dashboard/properties`;
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8" />
    <title>Welcome to ContCave - Host</title>
    <style>
      .preheader { display: none !important; visibility: hidden; opacity: 0; height: 0; width: 0; overflow: hidden; }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
    <span class="preheader">Welcome to India's creator ecosystem!</span>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:40px 0;">
          <table width="100%" style="max-width:480px;background:#ffffff;border-radius:8px;padding:32px;">
            <tr>
              <td style="color:#374151;font-size:15px;line-height:1.6;">
                <p>Hi ${name},</p>
                <p>Welcome to <strong>ContCave</strong>! We're thrilled to have you join our ecosystem as a host.</p>
                <p>As a host, you can list your studio, manage bookings, and connect with top-tier creators across the country.</p>
                <div style="text-align:center;margin:32px 0;">
                  <a href="${ctaUrl}"
                     style="background:#000000;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block;">
                    Manage your Properties
                  </a>
                </div>
                <p style="font-size:14px;color:#6b7280;">If you have any questions or need help getting started, simply reply to this email.</p>
                <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0;" />
                <p style="font-size:13px;color:#9ca3af;line-height:1.6;margin:0;">
                  Building an ecosystem for India’s growing creator economy.<br /><br />
                  ContCave by Arkanet Ventures LLP.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;
}

export function getCustomerOnboardingTemplate(name: string): string {
  const ctaUrl = `${getBaseUrl()}/home`;
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8" />
    <title>Welcome to ContCave</title>
    <style>
      .preheader { display: none !important; visibility: hidden; opacity: 0; height: 0; width: 0; overflow: hidden; }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
    <span class="preheader">Welcome to India's creator ecosystem!</span>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:40px 0;">
          <table width="100%" style="max-width:480px;background:#ffffff;border-radius:8px;padding:32px;">
            <tr>
              <td style="color:#374151;font-size:15px;line-height:1.6;">
                <p>Hi ${name},</p>
                <p>Welcome to <strong>ContCave</strong>! We're thrilled to have you join our ecosystem for India's growing creator economy.</p>
                <p>Discover the perfect spaces for your creative projects, manage your bookings, and find your next inspiration.</p>
                <div style="text-align:center;margin:32px 0;">
                  <a href="${ctaUrl}"
                     style="background:#000000;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block;">
                    Start Exploring Spaces
                  </a>
                </div>
                <p style="font-size:14px;color:#6b7280;">If you have any questions or need help getting started, simply reply to this email.</p>
                <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0;" />
                <p style="font-size:13px;color:#9ca3af;line-height:1.6;margin:0;">
                  Building an ecosystem for India’s growing creator economy.<br /><br />
                  ContCave by Arkanet Ventures LLP.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;
}

export async function sendReservationConfirmationCustomer(input: {
  toEmail: string;
  toName?: string;
  studioName: string;
  startDate: string;
  startTime: string;
  endTime: string;
  totalPrice: number;
  addons?: string | null;
  studioLocation: string;
  additionalInfo?: string;
  setNames?: string;
  packageTitle?: string | null;
  templateId?: string;
  bookingId?: string;
  attachments?: AttachmentInput[];
}) {
  await sendEmail({
    toEmail: input.toEmail,
    toName: input.toName || "",
    subject: `Your ContCave booking is confirmed: ${input.studioName}`,
    html: getReservationEmailHtml({
      greetingName: input.toName || "there",
      intro: `This email confirms your booking for ${input.studioName}.`,
      studioName: input.studioName,
      startDate: input.startDate,
      startTime: input.startTime,
      endTime: input.endTime,
      totalPrice: input.totalPrice,
      addons: input.addons,
      studioLocation: input.studioLocation,
      nextSteps: [
        "Review the studio's guidelines for parking, access, and equipment use.",
        "Arrive at least 15 minutes before your booking time.",
      ],
    }),
    attachments: input.attachments,
  });
}

export async function sendReservationConfirmationOwner(input: {
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
  addons?: string | null;
  formattedStartDate?: string;
  formattedStartTime?: string;
  formattedEndTime?: string;
  attachments?: AttachmentInput[];
}) {
  await sendEmail({
    toEmail: input.toEmail,
    toName: input.toName || "",
    subject: `New ContCave booking: ${input.studioName}`,
    html: getReservationEmailHtml({
      greetingName: input.toName || "there",
      intro: `${input.customerName || "A customer"} booked ${input.studioName}.`,
      studioName: input.studioName,
      startDate: input.formattedStartDate || input.startDate,
      startTime: input.formattedStartTime || input.startTime,
      endTime: input.formattedEndTime || input.endTime,
      totalPrice: input.totalPrice,
      addons: input.addons,
      nextSteps: ["Review the booking in your dashboard and prepare the studio for the scheduled slot."],
    }),
    attachments: input.attachments,
  });
}

export async function sendCuratedOutreachEmail(input: {
  toEmail: string;
  studioName: string;
  city: string;
  listingId: string;
}) {
  const waNumber = process.env.NEXT_PUBLIC_CONTCAVE_WHATSAPP ?? "";
  const contactEmail = process.env.MAILERSEND_FROM_EMAIL ?? "info@contcave.com";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://contcave.com";

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/><title>Your studio is on ContCave</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#374151;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
    <table width="100%" style="max-width:560px;background:#ffffff;border-radius:8px;padding:32px;"><tr><td style="font-size:15px;line-height:1.7;">
      <p>Hi ${escapeHtml(input.studioName)} Team,</p>
      <p>We've added <strong>${escapeHtml(input.studioName)}</strong> to <strong>ContCave</strong> — a curated marketplace where brands discover studios for shoots and productions in ${escapeHtml(input.city)}.</p>
      <p>Your studio is listed as a <strong>ContCave Curated</strong> studio. We've added basic information to help brands find you and are already directing interested brands your way.</p>
      <p>View your listing: <a href="${baseUrl}/listings/${escapeHtml(input.listingId)}" style="color:#b45309;">${baseUrl}/listings/${escapeHtml(input.listingId)}</a></p>
      <p>To update your listing, add pricing, or explore a full partnership, reach us at:</p>
      <ul style="padding-left:20px;">
        ${waNumber ? `<li>WhatsApp: <a href="https://wa.me/${escapeHtml(waNumber)}" style="color:#b45309;">+${escapeHtml(waNumber)}</a></li>` : ""}
        <li>Email: <a href="mailto:${escapeHtml(contactEmail)}" style="color:#b45309;">${escapeHtml(contactEmail)}</a></li>
        <li>Website: <a href="https://contcave.com/contact" style="color:#b45309;">contcave.com/contact</a></li>
      </ul>
      <p style="color:#6b7280;font-size:13px;">No action needed if you're happy with the listing as-is.</p>
      <p>— Team ContCave</p>
    </td></tr></table>
  </td></tr></table>
</body>
</html>`;

  await sendEmail({
    toEmail: input.toEmail,
    toName: `${input.studioName} Team`,
    subject: `We've listed ${input.studioName} on ContCave`,
    html,
  });
}
