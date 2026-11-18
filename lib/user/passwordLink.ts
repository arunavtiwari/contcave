import "server-only";

import crypto from "crypto";

import { sendEmail } from "@/lib/email/mailer";
import { getPasswordLinkTemplate, PASSWORD_LINK_COPY, type PasswordLinkPurpose } from "@/lib/email/templates";
import { UserService } from "@/lib/user/service";
import { getValidatedBaseUrl } from "@/lib/utils";

const LINK_TTL_MS: Record<PasswordLinkPurpose, number> = {
    reset: 60 * 60 * 1000,
    invite: 3 * 24 * 60 * 60 * 1000,
};

/**
 * Emails a one-time link to /reset-password. The token is stored hashed and cleared again if
 * the email can't be sent, so a dead link never lingers. Returns whether the email went out.
 */
export async function sendPasswordLink(
    user: { id: string; name: string | null; email: string },
    purpose: PasswordLinkPurpose
): Promise<boolean> {
    const token = crypto.randomBytes(32).toString("hex");
    await UserService.createResetToken(user.id, token, new Date(Date.now() + LINK_TTL_MS[purpose]));

    try {
        const linkUrl = `${getValidatedBaseUrl()}/reset-password?token=${token}`;
        await sendEmail({
            toEmail: user.email,
            toName: user.name || "User",
            subject: PASSWORD_LINK_COPY[purpose].subject,
            html: getPasswordLinkTemplate(user.name || "User", linkUrl, purpose),
        });
        return true;
    } catch (error) {
        await UserService.clearResetToken(user.id).catch(() => { });
        console.error(`[PasswordLink] Failed to send ${purpose} email`, error);
        return false;
    }
}
