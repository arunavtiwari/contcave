/**
 * GST Constants for Invoice Generation and Payout Calculations
 * 
 * Case 1: Studio has GST → Invoice shows studio's GST, studio receives 88% of total
 * Case 2: Studio doesn't have GST → Invoice shows Arkanet's GST, studio receives 88% of base (excluding GST)
 */

export const ARKANET_VENTURES_GST = {
    companyName: "Arkanet Ventures LLP",
    gstin: "09ACGFA5238G1ZE",
    stateCode: "09",
    address: "SN/317-A, Shanti Nagar, Lucknow, Uttar Pradesh - 226008",
} as const;

export const GST_RATE = 0.18;
export const PLATFORM_COMMISSION_PERCENT = 12; // Arkanet keeps 12% commission
export const DEFAULT_SAC_CODE = "998599"; // Other business support services

