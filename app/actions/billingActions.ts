"use server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { BillingService } from "@/lib/billing/service";

export async function saveBillingInfo(data: {
    companyName: string;
    gstin: string;
    billingAddress: string;
    isDefault?: boolean;
}) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser?.id) throw new Error("Unauthorized");

        return await BillingService.upsertRecord(currentUser.id, data);
    } catch (error) {
        console.error("[saveBillingInfo] Error:", error);
        throw error;
    }
}
