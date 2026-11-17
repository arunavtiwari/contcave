import "server-only";

import crypto from "crypto";

import prisma from "@/lib/prismadb";
import { getValidatedBaseUrl } from "@/lib/utils";

/**
 * Guest checkout: people can book without logging in. Their booking belongs to an account
 * (created from the email they entered, or the existing one for that email), but they are never
 * signed in by checkout. Instead they reach the booking through a signed link tied to the
 * payment reference, shown after payment and sent in the confirmation email.
 */
export const GUEST_ACCESS_PARAM = "g";

let signingKey: Buffer | undefined;

function guestSigningKey() {
    if (signingKey) return signingKey;
    const secret = process.env.AUTH_SECRET;
    if (!secret) throw new Error("Server configuration error (AUTH_SECRET)");
    signingKey = Buffer.from(crypto.hkdfSync("sha256", secret, "", "contcave:guest-booking", 32));
    return signingKey;
}

/** Token granting read access to one booking payment, identified by its gateway reference. */
export function guestBookingToken(paymentRef: string): string {
    return crypto.createHmac("sha256", guestSigningKey()).update(paymentRef).digest("base64url");
}

export function isValidGuestBookingToken(paymentRef: string, token: string | null | undefined): boolean {
    if (!token || !paymentRef) return false;
    const expected = Buffer.from(guestBookingToken(paymentRef));
    const provided = Buffer.from(token);
    return expected.length === provided.length && crypto.timingSafeEqual(expected, provided);
}

/** The booking status page for a guest, which works without logging in. */
export function guestBookingUrl(paymentRef: string): string {
    const params = new URLSearchParams({ tid: paymentRef, [GUEST_ACCESS_PARAM]: guestBookingToken(paymentRef) });
    return `${getValidatedBaseUrl()}/payments/cashfree/return?${params.toString()}`;
}

/** What a guest booking records on its payment, so emails can include the right links. */
export type GuestCheckoutMeta = {
    /** True when checkout created the account; it has no password yet. */
    accountCreated: boolean;
};

export function readGuestCheckoutMeta(metadata: unknown): GuestCheckoutMeta | null {
    const guest = (metadata as { guestCheckout?: unknown } | null)?.guestCheckout as
        | { accountCreated?: unknown }
        | undefined;
    return guest && typeof guest === "object" ? { accountCreated: guest.accountCreated === true } : null;
}

/**
 * The account whose booking a payment-status request may read: the guest booking's account when a
 * valid guest token for this payment reference is supplied, otherwise the signed-in user.
 */
export async function resolveBookingViewerId(
    paymentRef: string,
    access: string | null | undefined,
    sessionUserId: string | null | undefined
): Promise<string | null> {
    if (access && isValidGuestBookingToken(paymentRef, access)) {
        const txn = await prisma.transaction.findFirst({
            where: { cfTxnRef: paymentRef },
            select: { userId: true },
        });
        if (txn?.userId) return txn.userId;
    }
    return sessionUserId || null;
}
