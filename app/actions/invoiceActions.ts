"use server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { ensureInvoiceWithAttachment } from "@/lib/invoice/createInvoiceRecord";

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
    amount: number;
}) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser?.id) throw new Error("Unauthorized");

        const { invoice } = await ensureInvoiceWithAttachment({
            userId: currentUser.id,
            reservationId: requireObjectId(data.reservationId, "reservationId"),
            transactionId: requireObjectId(data.transactionId, "transactionId"),
            amountOverride: Math.round(data.amount),
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
