import { getValidatedBaseUrl } from "@/lib/utils";

import { escapeEmailHtml } from "./html";
import { AttachmentInput, sendEmail } from "./mailer";

function formatInr(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function buildReservationEmailHtml(input: {
  greetingName: string;
  intro: string;
  studioName: string;
  startDate: string;
  startTime: string;
  endTime: string;
  totalPrice: number;
  amountLabel?: string;
  detailsHeading?: string;
  addons?: string | null;
  studioLocation?: string;
  nextSteps?: string[];
  cta?: { label: string; url: string };
}) {
  const hasAddons = Boolean(input.addons?.trim());
  const detailRows = [
    ["Date", input.startDate],
    ...(input.startTime || input.endTime ? [["Time", `${input.startTime} - ${input.endTime}`]] : []),
    [input.amountLabel || "Total", formatInr(input.totalPrice)],
    ...(hasAddons ? [["Add-ons", input.addons!]] : []),
    ...(input.studioLocation ? [["Location", input.studioLocation]] : []),
  ];

  return `
  <!DOCTYPE html>
  <html>
  <head><meta charset="UTF-8" /><title>ContCave Booking Update</title></head>
  <body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#374151;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table width="100%" style="max-width:560px;background:#ffffff;border-radius:8px;padding:32px;">
            <tr>
              <td style="font-size:15px;line-height:1.6;">
                <div style="margin-bottom:24px;text-align:left;">
                  <img src="${getValidatedBaseUrl()}/assets/logo.png" alt="ContCave" style="height:36px;width:auto;display:block;" />
                </div>
                <p>Hi ${escapeEmailHtml(input.greetingName)},</p>
                <p>${escapeEmailHtml(input.intro)}</p>
                <h2 style="font-size:18px;color:#111827;margin:24px 0 12px;">${escapeEmailHtml(input.detailsHeading || "Booking Details")}</h2>
                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                  ${detailRows.map(([label, value]) => `
                    <tr>
                      <td style="padding:8px 0;color:#6b7280;width:120px;">${escapeEmailHtml(label)}</td>
                      <td style="padding:8px 0;color:#111827;font-weight:600;">${escapeEmailHtml(value)}</td>
                    </tr>
                  `).join("")}
                </table>
                ${input.nextSteps?.length ? `
                  <h2 style="font-size:18px;color:#111827;margin:24px 0 12px;">Next Steps</h2>
                  <ul style="padding-left:20px;margin:0;">
                    ${input.nextSteps.map((step) => `<li>${escapeEmailHtml(step)}</li>`).join("")}
                  </ul>
                ` : ""}
                ${input.cta ? `
                  <p style="text-align:center;margin:28px 0 0;">
                    <a href="${escapeEmailHtml(input.cta.url)}" style="background:#111827;color:#ffffff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block;">${escapeEmailHtml(input.cta.label)}</a>
                  </p>
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

export function getEmailVerificationCodeTemplate(name: string, code: string): string {
  return `
  <!DOCTYPE html>
  <html>
  <head><meta charset="UTF-8" /><title>Verify your ContCave email</title></head>
  <body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#374151;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px;">
      <table width="100%" style="max-width:480px;background:#ffffff;border-radius:8px;padding:32px;"><tr><td style="font-size:15px;line-height:1.6;">
        <div style="margin-bottom:24px;"><img src="${getValidatedBaseUrl()}/assets/logo.png" alt="ContCave" style="height:36px;width:auto;display:block;" /></div>
        <p>Hi ${escapeEmailHtml(name || "there")},</p>
        <p>Enter this code in ContCave to confirm that this email address belongs to you:</p>
        <p style="margin:28px 0;text-align:center;font-size:30px;letter-spacing:8px;font-weight:700;color:#111827;">${escapeEmailHtml(code)}</p>
        <p style="font-size:14px;color:#6b7280;">This code expires in 10 minutes. If you did not request it, you can safely ignore this email.</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0;" />
        <p style="font-size:13px;color:#9ca3af;margin:0;">ContCave by Arkanet Ventures LLP.</p>
      </td></tr></table>
    </td></tr></table>
  </body>
  </html>`;
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
                <div style="margin-bottom:24px;text-align:left;">
                  <img src="${getValidatedBaseUrl()}/assets/logo.png" alt="ContCave" style="height:36px;width:auto;display:block;" />
                </div>
                <p>Hi ${escapeEmailHtml(name || "there")},</p>
                <p>We received a request to reset your password. Click the button below to choose a new one:</p>
                <p style="font-size:14px;color:#6b7280;">This link expires in one hour.</p>
                <div style="text-align:center;margin:32px 0;">
                    <a href="${escapeEmailHtml(resetUrl)}" 
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
  const ctaUrl = `${getValidatedBaseUrl()}/dashboard/properties`;
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
                <div style="margin-bottom:24px;text-align:left;">
                  <img src="${getValidatedBaseUrl()}/assets/logo.png" alt="ContCave" style="height:36px;width:auto;display:block;" />
                </div>
                <p>Hi ${escapeEmailHtml(name)},</p>
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
                  Building an ecosystem for India's growing creator economy.<br /><br />
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
  const ctaUrl = `${getValidatedBaseUrl()}/home`;
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
                <div style="margin-bottom:24px;text-align:left;">
                  <img src="${getValidatedBaseUrl()}/assets/logo.png" alt="ContCave" style="height:36px;width:auto;display:block;" />
                </div>
                <p>Hi ${escapeEmailHtml(name)},</p>
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
                  Building an ecosystem for India's growing creator economy.<br /><br />
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
  attachments: AttachmentInput[];
}) {
  await sendEmail({
    toEmail: input.toEmail,
    toName: input.toName || "",
    subject: `Your ContCave booking is confirmed: ${input.studioName}`,
    html: buildReservationEmailHtml({
      greetingName: input.toName || "there",
      intro: `Your booking for ${input.studioName} has been confirmed. The tax invoice for this booking is attached for your records.`,
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

export async function sendCustomerPaymentInvoice(input: {
  toEmail: string;
  toName?: string;
  studioName: string;
  bookingId: string;
  paymentLabel: string;
  startDate: string;
  startTime: string;
  endTime: string;
  amount: number;
  studioLocation?: string;
  attachments: AttachmentInput[];
}) {
  await sendEmail({
    toEmail: input.toEmail,
    toName: input.toName || "",
    subject: `Your ContCave tax invoice: ${input.paymentLabel}`,
    html: buildReservationEmailHtml({
      greetingName: input.toName || "there",
      intro: `Your tax invoice for ${input.paymentLabel} at ${input.studioName} is attached for your records.`,
      studioName: input.studioName,
      startDate: input.startDate,
      startTime: input.startTime,
      endTime: input.endTime,
      totalPrice: input.amount,
      amountLabel: "Amount paid",
      detailsHeading: "Payment Details",
      studioLocation: input.studioLocation,
      nextSteps: ["Keep this tax invoice for your records.", "Contact ContCave support if you need help with this payment."],
    }),
    attachments: input.attachments,
  });
}

export async function sendReservationReceivedCustomer(input: {
  toEmail: string;
  toName?: string;
  studioName: string;
  startDate: string;
  startTime: string;
  endTime: string;
  totalPrice: number;
  addons?: string | null;
  studioLocation: string;
  bookingId?: string;
  attachments: AttachmentInput[];
}) {
  await sendEmail({
    toEmail: input.toEmail,
    toName: input.toName || "",
    subject: `We received your ContCave booking request: ${input.studioName}`,
    html: buildReservationEmailHtml({
      greetingName: input.toName || "there",
      intro: `We have received your booking request for ${input.studioName}. Your payment receipt is attached for your records. The studio owner has been notified and will review it shortly. We will email you once a decision has been made.`,
      studioName: input.studioName,
      startDate: input.startDate,
      startTime: input.startTime,
      endTime: input.endTime,
      totalPrice: input.totalPrice,
      addons: input.addons,
      studioLocation: input.studioLocation,
      nextSteps: [
        "We will notify you as soon as the studio owner approves your booking.",
        "You can track this request from your bookings dashboard.",
      ],
    }),
    attachments: input.attachments,
  });
}

export async function sendReviewReminderCustomer(input: {
  toEmail: string;
  toName?: string;
  studioName: string;
  startDate: string;
  startTime: string;
  endTime: string;
  totalPrice: number;
  studioLocation?: string;
  reviewUrl: string;
}) {
  await sendEmail({
    toEmail: input.toEmail,
    toName: input.toName || "",
    subject: `How was ${input.studioName}?`,
    html: buildReservationEmailHtml({
      greetingName: input.toName || "there",
      intro: `Your session at ${input.studioName} has been completed. Share a short review to help other creators choose the right space.`,
      studioName: input.studioName,
      startDate: input.startDate,
      startTime: input.startTime,
      endTime: input.endTime,
      totalPrice: input.totalPrice,
      studioLocation: input.studioLocation,
      detailsHeading: "Completed Booking",
      cta: { label: "Leave a review", url: input.reviewUrl },
    }),
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
    html: buildReservationEmailHtml({
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

export async function sendReservationRejectedCustomer(input: {
  toEmail: string;
  toName?: string;
  studioName: string;
  startDate: string;
  startTime: string;
  endTime: string;
  totalPrice: number;
  rejectReason?: string | null;
  attachments: AttachmentInput[];
}) {
  await sendEmail({
    toEmail: input.toEmail,
    toName: input.toName || "",
    subject: `Your ContCave booking was not approved: ${input.studioName}`,
    html: buildReservationEmailHtml({
      greetingName: input.toName || "there",
      intro: `The studio was unable to approve your booking request for ${input.studioName}. A refund has been initiated to your original payment method, and the refund voucher is attached for your records.`,
      studioName: input.studioName,
      startDate: input.startDate,
      startTime: input.startTime,
      endTime: input.endTime,
      totalPrice: input.totalPrice,
      nextSteps: [
        input.rejectReason ? `Reason provided: ${input.rejectReason}` : "Reason provided: Not specified.",
        "Contact ContCave support if you need help with refund eligibility or status.",
      ],
    }),
    attachments: input.attachments,
  });
}

export async function sendReservationCancelledOwner(input: {
  toEmail: string;
  toName?: string;
  customerName: string;
  studioName: string;
  startDate: string;
  startTime: string;
  endTime: string;
  totalPrice: number;
  attachments?: AttachmentInput[];
}) {
  await sendEmail({
    toEmail: input.toEmail,
    toName: input.toName || "",
    subject: `Booking request cancelled: ${input.studioName}`,
    html: buildReservationEmailHtml({
      greetingName: input.toName || "there",
      intro: `${input.customerName || "The customer"} cancelled their pending booking request for ${input.studioName}. The slot has been released. Any refund must be reviewed and recorded by the ContCave team according to the booking policy.`,
      studioName: input.studioName,
      startDate: input.startDate,
      startTime: input.startTime,
      endTime: input.endTime,
      totalPrice: input.totalPrice,
      nextSteps: ["No action is required from your side."],
    }),
    attachments: input.attachments,
  });
}

export async function sendReservationPendingOwner(input: {
  toEmail: string;
  toName?: string;
  studioName: string;
  startDate: string;
  startTime: string;
  endTime: string;
  totalPrice: number;
  customerName: string;
  bookingId?: string;
  addons?: string | null;
}) {
  await sendEmail({
    toEmail: input.toEmail,
    toName: input.toName || "",
    subject: `New ContCave booking request: ${input.studioName}`,
    html: buildReservationEmailHtml({
      greetingName: input.toName || "there",
      intro: `${input.customerName || "A customer"} has paid for a booking request at ${input.studioName}. Please approve or reject it from your dashboard.`,
      studioName: input.studioName,
      startDate: input.startDate,
      startTime: input.startTime,
      endTime: input.endTime,
      totalPrice: input.totalPrice,
      addons: input.addons,
      nextSteps: ["Review the pending request in your reservations dashboard."],
    }),
  });
}

export async function sendReservationRefundCustomer(input: {
  toEmail: string;
  toName?: string;
  studioName: string;
  startDate: string;
  startTime: string;
  endTime: string;
  totalPrice: number;
  reason?: string | null;
  attachments: AttachmentInput[];
}) {
  await sendEmail({
    toEmail: input.toEmail,
    toName: input.toName || "",
    subject: `Refund initiated for your ContCave booking request: ${input.studioName}`,
    html: buildReservationEmailHtml({
      greetingName: input.toName || "there",
      intro: `Your pending booking request for ${input.studioName} has been cancelled. A refund has been initiated to your original payment method, and the refund voucher is attached for your records.`,
      studioName: input.studioName,
      startDate: input.startDate,
      startTime: input.startTime,
      endTime: input.endTime,
      totalPrice: input.totalPrice,
      nextSteps: [
        input.reason ? `Reason: ${input.reason}` : "Reason: Booking request cancelled before host approval.",
        "Refunds usually reflect within 5-7 business days, depending on your bank or payment provider.",
      ],
    }),
    attachments: input.attachments,
  });
}

export async function sendPayoutProcessedOwner(input: {
  toEmail: string;
  toName?: string;
  studioName: string;
  bookingId?: string | null;
  bookingDate: string;
  payoutAmount: number;
}) {
  await sendEmail({
    toEmail: input.toEmail,
    toName: input.toName || "",
    subject: `ContCave payout processed: ${input.studioName}`,
    html: buildReservationEmailHtml({
      greetingName: input.toName || "there",
      intro: `Your payout for ${input.studioName} has been processed for settlement to your registered bank account.`,
      studioName: input.studioName,
      startDate: input.bookingDate,
      startTime: "",
      endTime: "",
      totalPrice: input.payoutAmount,
      amountLabel: "Payout",
      detailsHeading: "Payout Details",
      nextSteps: [
        input.bookingId ? `Booking ID: ${input.bookingId}` : "You can review this payout from your dashboard.",
        "Settlement timing depends on your Cashfree schedule and bank processing timelines.",
      ],
    }),
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
  const baseUrl = getValidatedBaseUrl();

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/><title>Your studio is on ContCave</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#374151;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
    <table width="100%" style="max-width:560px;background:#ffffff;border-radius:8px;padding:32px;"><tr><td style="font-size:15px;line-height:1.7;">
      <p>Hi ${escapeEmailHtml(input.studioName)} Team,</p>
      <p>We've added <strong>${escapeEmailHtml(input.studioName)}</strong> to <strong>ContCave</strong> - a curated marketplace where brands discover studios for shoots and productions in ${escapeEmailHtml(input.city)}.</p>
      <p>Your studio is listed as a <strong>ContCave Curated</strong> studio. We've added basic information to help brands find you and are already directing interested brands your way.</p>
      <p>View your listing: <a href="${baseUrl}/listings/${escapeEmailHtml(input.listingId)}" style="color:#b45309;">${baseUrl}/listings/${escapeEmailHtml(input.listingId)}</a></p>
      <p>To update your listing, add pricing, or explore a full partnership, reach us at:</p>
      <ul style="padding-left:20px;">
        ${waNumber ? `<li>WhatsApp: <a href="https://wa.me/${escapeEmailHtml(waNumber)}" style="color:#b45309;">+${escapeEmailHtml(waNumber)}</a></li>` : ""}
        <li>Email: <a href="mailto:${escapeEmailHtml(contactEmail)}" style="color:#b45309;">${escapeEmailHtml(contactEmail)}</a></li>
        <li>Website: <a href="https://contcave.com/contact" style="color:#b45309;">contcave.com/contact</a></li>
      </ul>
      <p style="color:#6b7280;font-size:13px;">No action needed if you're happy with the listing as-is.</p>
      <p>- Team ContCave</p>
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

export function getReservationFailedTemplate(name: string, orderId: string): string {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8" />
    <title>Booking Payment Failed</title>
  </head>
  <body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#374151;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:40px 0;">
          <table width="100%" style="max-width:480px;background:#ffffff;border-radius:8px;padding:32px;">
            <tr>
              <td style="color:#374151;font-size:15px;line-height:1.6;">
                <div style="margin-bottom:24px;text-align:left;">
                  <img src="${getValidatedBaseUrl()}/assets/logo.png" alt="ContCave" style="height:36px;width:auto;display:block;" />
                </div>
                <p>Hi ${escapeEmailHtml(name)},</p>
                <p>We were unable to process payment for your booking request (Order ID: <strong>${escapeEmailHtml(orderId)}</strong>).</p>
                <p>If your bank shows a debit for this attempt, the amount will be reversed or refunded to your original payment method. Processing times vary by bank and payment provider.</p>
                <p>You can return to ContCave to try the booking again.</p>
                <div style="text-align:center;margin:32px 0;">
                  <a href="${getValidatedBaseUrl()}/home"
                     style="background:#000000;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block;">
                    Try Booking Again
                  </a>
                </div>
                <p style="font-size:14px;color:#6b7280;">If you need assistance, feel free to reply to this email.</p>
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

export async function sendReservationFailedEmail(input: {
  toEmail: string;
  toName?: string;
  orderId: string;
}) {
  await sendEmail({
    toEmail: input.toEmail,
    toName: input.toName || "",
    subject: `Payment failed for your booking: Order #${input.orderId}`,
    html: getReservationFailedTemplate(input.toName || "there", input.orderId),
  });
}
