import { AttachmentInput, sendTemplateEmail } from "./mailer";

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
  const ctaUrl = `${process.env.NEXTAUTH_URL}/dashboard/properties`;
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
  const ctaUrl = `${process.env.NEXTAUTH_URL}/home`;
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

// Reservation Confirmation Customer With Invoice
export async function sendReservationConfirmationCustomer(input: {
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
  bookingId?: string;
  attachments?: AttachmentInput[];
}) {
  await sendTemplateEmail({
    toEmail: input.toEmail,
    toName: input.toName || "",
    templateId: input.templateId || process.env.MS_TPL_RESERVATION_CUSTOMER || "",
    data: {
      customer_name: input.toName || "",
      studio_name: input.studioName,
      bookingId: input.bookingId || "",
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

// Reservation Confirmation Owner With Invoice
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
