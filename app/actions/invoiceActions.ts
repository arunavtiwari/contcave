"use server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { ensureInvoiceWithAttachment } from "@/lib/invoice/createInvoiceRecord";
import prisma from "@/lib/prismadb";

const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

function requireObjectId(value: unknown, fieldName: string) {
    if (typeof value !== "string" || !OBJECT_ID_PATTERN.test(value.trim())) {
        throw new Error(`${fieldName} must be a valid id`);
    }

    return value.trim();
}

export async function createInvoice(data: {
    reservationId: string;
    transactionId: string;
}) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser?.id) throw new Error("Unauthorized");

        const reservationId = requireObjectId(data.reservationId, "reservationId");
        const reservation = await prisma.reservation.findFirst({
            where: { id: reservationId, userId: currentUser.id },
            select: { isApproved: true },
        });
        if (!reservation) throw new Error("Reservation not found");
        if (reservation.isApproved !== 1) {
            throw new Error("Tax invoice is available only after booking confirmation");
        }

        const { invoice } = await ensureInvoiceWithAttachment({
            userId: currentUser.id,
            reservationId,
            transactionId: requireObjectId(data.transactionId, "transactionId"),
        });

        return {
            invoiceUrl: invoice.invoiceUrl,
            invoiceId: invoice.id,
        };
    } catch (error) {
        console.error("[createInvoice] Error:", error);
        throw error;
    }
}
