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

