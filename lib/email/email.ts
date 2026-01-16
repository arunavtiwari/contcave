export function resetPasswordEmail(
    name: string,
    resetUrl: string
): string {
    return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8" />
    <title>Reset your password</title>
  

    <style>
      .preheader {
        display: none !important;
        visibility: hidden;
        opacity: 0;
        height: 0;
        width: 0;
        overflow: hidden;
      }
    </style>
  </head>
  
  <body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
    <span class="preheader">
      Reset your ContCave password securely.
    </span>
  
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:40px 0;">
          <table width="100%" style="max-width:480px;background:#ffffff;border-radius:8px;padding:32px;">
  
            <tr>
              <td style="color:#374151;font-size:15px;line-height:1.6;">
                <p>Hi ${name},</p>
  
                <p>
                  We received a request to reset your password.
                  Click the button below to set a new one.
                </p>
  
                <div style="text-align:center;margin:32px 0;">
                  <a href="${resetUrl}"
                     style="
                       background:#000000;
                       color:#ffffff;
                       padding:12px 24px;
                       border-radius:6px;
                       text-decoration:none;
                       font-weight:600;
                       display:inline-block;
                     ">
                    Reset password
                  </a>
                </div>
  
                <p style="font-size:14px;color:#6b7280;">
                  This link will expire in 1 hour.
                  If you didn’t request this, you can safely ignore this email.
                </p>


                <hr style="
                border:none;
                border-top:1px solid #e5e7eb;
                margin:32px 0;
                " />


                <p style="font-size:14px;color:#374151;margin:0 0 8px 0;">
                <strong>Need help?</strong>
                </p>

                <p style="font-size:14px;color:#6b7280;line-height:1.6;margin:0 0 16px 0;">
                We’re here to support you every step of the way.
                If you have any questions, just reply to this email or write to us at
                <a href="mailto:info@contcave.com" style="color:#2563eb;text-decoration:none;">
                    info@contcave.com
                </a>.
                </p>

                <p text-align:center;style="font-size:13px;color:#9ca3af;line-height:1.6;margin:0;">
                Building an ecosystem for India’s growing creator economy.
                <br /><br />
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

