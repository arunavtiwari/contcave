/**
 * Offline bookings can be recorded without a customer email, but every reservation needs a
 * user, and `User.email` has a non-sparse unique index (only one user may lack an email).
 * Such customers get a unique address on the reserved `.invalid` TLD instead. It can never
 * receive mail, and every send path treats it as "no email on file".
 */
const PLACEHOLDER_DOMAIN = "offline-customer.contcave.invalid";

export function offlinePlaceholderEmail(): string {
    const random = Math.random().toString(36).slice(2, 10);
    return `offline-${Date.now().toString(36)}-${random}@${PLACEHOLDER_DOMAIN}`;
}

export function isPlaceholderEmail(email: string | null | undefined): boolean {
    return Boolean(email && email.toLowerCase().endsWith(`@${PLACEHOLDER_DOMAIN}`));
}

/** The email to send to, or null when there is none or it is an offline placeholder. */
export function deliverableEmail(email: string | null | undefined): string | null {
    if (!email || isPlaceholderEmail(email)) return null;
    return email;
}
