import "server-only";

import { UserFacingError } from "@/lib/errors";
import prisma from "@/lib/prismadb";
import { UserRole } from "@/types/user";

export type GuestBuyerInput = {
    name: string;
    phone: string;
    email: string;
    billing?: { companyName: string; gstin: string; billingAddress: string } | null;
};

export type GuestBuyer = {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    /** True when this checkout created the account (it has no password yet). */
    accountCreated: boolean;
    billingDetailId: string | null;
};

/**
 * Finds or creates the account a guest booking belongs to. An existing account for the email is
 * reused but never signed in, so typing someone's email can't open their account; it only adds a
 * booking they'll see when they log in. New accounts have no password until the guest sets one.
 */
export async function resolveGuestBuyer(input: GuestBuyerInput): Promise<GuestBuyer> {
    const email = input.email.trim().toLowerCase();
    const name = input.name.trim();
    const phone = input.phone.trim();

    let accountCreated = false;
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
        try {
            user = await prisma.user.create({
                data: {
                    email,
                    name,
                    phone,
                    role: UserRole.CUSTOMER,
                    email_verified: false,
                    phone_verified: false,
                },
            });
            accountCreated = true;
        } catch {
            // Two checkouts with the same new email at once: the other one created it.
            user = await prisma.user.findUnique({ where: { email } });
            if (!user) throw new UserFacingError("Couldn't start checkout. Please try again.");
        }
    } else if (!user.phone || !user.name) {
        // Fill gaps only; never overwrite details on an account the guest hasn't proved is theirs.
        user = await prisma.user.update({
            where: { id: user.id },
            data: {
                ...(!user.phone ? { phone } : {}),
                ...(!user.name ? { name } : {}),
            },
        });
    }

    let billingDetailId: string | null = null;
    if (input.billing) {
        const gstin = input.billing.gstin.trim().toUpperCase();
        const existing = await prisma.billingDetails.findFirst({
            where: { userId: user.id, gstin },
            select: { id: true },
        });
        billingDetailId = existing?.id ?? (await prisma.billingDetails.create({
            data: {
                userId: user.id,
                companyName: input.billing.companyName.trim(),
                gstin,
                billingAddress: input.billing.billingAddress.trim(),
                isDefault: false,
            },
            select: { id: true },
        })).id;
    }

    return {
        id: user.id,
        // The booking uses the details typed at checkout for the gateway and invoice name.
        name: name || user.name,
        email,
        phone: phone || user.phone,
        accountCreated,
        billingDetailId,
    };
}
