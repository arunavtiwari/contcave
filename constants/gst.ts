/**
 * GST Constants for Invoice Generation and Payout Calculations
 * 
 * Case 1: Studio has GST → Invoice shows studio's GST, studio receives 88% of total
 * Case 2: Studio doesn't have GST → Invoice shows Arkanet's GST, studio receives 88% of base (excluding GST)
 */

export const ARKANET_VENTURES_GST = {
    companyName: "Arkanet Ventures LLP",
    gstin: "09ACGFA5238G1ZE",
    address: "Your registered address here", // TODO: Update with actual registered address
} as const;

export const GST_RATE = 0.18;
export const PLATFORM_COMMISSION_PERCENT = 12; // Arkanet keeps 12% commission

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
