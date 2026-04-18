"use server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { ensureInvoiceWithAttachment } from "@/lib/invoice/createInvoiceRecord";

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
            reservationId: data.reservationId.trim(),
            transactionId: data.transactionId.trim(),
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
