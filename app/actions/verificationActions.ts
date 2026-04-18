"use server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { VerificationService } from "@/lib/verification/service";

// 1. Email Verification (MSG91)
export async function verifyEmailAction(email: string) {
    try {
        return await VerificationService.validateEmail(email);
    } catch (error) {
        console.error("[verifyEmailAction] Error:", error);
        throw error;
    }
}

// 2. Aadhaar OTP Generation (Cashfree)
export async function generateAadhaarOtpAction(aadhaarNumber: string) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser?.id) throw new Error("Unauthorized");
        return await VerificationService.generateAadhaarOtp(currentUser.id, aadhaarNumber);
    } catch (error) {
        console.error("[generateAadhaarOtpAction] Error:", error);
        throw error;
    }
}

// 3. Aadhaar OTP Verification (Cashfree)
export async function verifyAadhaarOtpAction(refId: string, otp: string) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser?.id) throw new Error("Unauthorized");
        return await VerificationService.verifyAadhaarOtp(currentUser.id, refId, otp);
    } catch (error) {
        console.error("[verifyAadhaarOtpAction] Error:", error);
        throw error;
    }
}

// 4. Create Cashfree Vendor
export async function createVendorAction(payload: Record<string, unknown>) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser?.id) throw new Error("Unauthorized");
        return await VerificationService.createVendor(currentUser.id, payload);
    } catch (error) {
        console.error("[createVendorAction] Error:", error);
        throw error;
    }
}

// 5. Unified Verification Step Update (Prisma)
export async function updateVerificationStepAction(data: {
    step: "email" | "phone" | "aadhaar" | "bank";
    phone?: string;
    aadhaarRefId?: string;
    aadhaarLast4?: string;
    bankVerifiedName?: string;
    vendorId?: string;
    accountNumber?: string;
    ifscCode?: string;
    bankName?: string;
    gstin?: string;
    companyName?: string;
}) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser?.id) throw new Error("Unauthorized");
        return await VerificationService.updateStep(currentUser.id, data);
    } catch (error) {
        console.error("[updateVerificationStepAction] Error:", error);
        throw error;
    }
}
