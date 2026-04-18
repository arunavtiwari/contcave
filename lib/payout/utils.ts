import { GST_RATE, PLATFORM_COMMISSION_PERCENT } from "@/constants/gst";

/**
 * Helper to determine if studio has valid GST registration
 */
export function hasValidGST(paymentDetails: {
    companyName?: string | null;
    gstin?: string | null;
} | null | undefined): boolean {
    return Boolean(
        paymentDetails?.companyName?.trim() &&
        paymentDetails?.gstin?.trim()
    );
}

/**
 * Calculate payout details based on GST ownership
 * 
 * @param totalAmount - Total amount paid by customer (including GST)
 * @param studioHasGST - Whether studio has GST registration
 * @returns Payout calculation details
 */
export function calculatePayoutDetails(
    totalAmount: number,
    studioHasGST: boolean
): {
    baseAmount: number;
    gstAmount: number;
    gstOwnedBy: "STUDIO" | "ARKANET";
    payoutToStudio: number;
    payoutPercentOfTotal: number;
    arkanetRetains: number;
} {
    const baseAmount = totalAmount / (1 + GST_RATE);
    const gstAmount = totalAmount - baseAmount;

    const platformCommissionOnBase = baseAmount * (PLATFORM_COMMISSION_PERCENT / 100);
    const studioShareOfBase = baseAmount - platformCommissionOnBase; // 88% of base

    if (studioHasGST) {
        // Studio gets 88% of base + 100% of GST
        const payoutToStudio = studioShareOfBase + gstAmount;
        return {
            baseAmount: Number(baseAmount.toFixed(2)),
            gstAmount: Number(gstAmount.toFixed(2)),
            gstOwnedBy: "STUDIO",
            payoutToStudio: Number(payoutToStudio.toFixed(2)),
            payoutPercentOfTotal: Number(((payoutToStudio / totalAmount) * 100).toFixed(2)),
            arkanetRetains: Number((totalAmount - payoutToStudio).toFixed(2)),
        };
    } else {
        // Studio gets 88% of base only (excluding GST)
        const payoutToStudio = studioShareOfBase;
        const payoutPercentOfTotal = (payoutToStudio / totalAmount) * 100;
        const arkanetRetains = totalAmount - payoutToStudio;

        return {
            baseAmount: Number(baseAmount.toFixed(2)),
            gstAmount: Number(gstAmount.toFixed(2)),
            gstOwnedBy: "ARKANET",
            payoutToStudio: Number(payoutToStudio.toFixed(2)),
            payoutPercentOfTotal: Number(payoutPercentOfTotal.toFixed(2)),
            arkanetRetains: Number(arkanetRetains.toFixed(2)),
        };
    }
}
