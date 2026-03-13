export interface PaymentProfile {
    id: string;
    userId?: string;
    accountHolderName?: string;
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    companyName?: string;
    gstin?: string;
    [key: string]: unknown;
}
