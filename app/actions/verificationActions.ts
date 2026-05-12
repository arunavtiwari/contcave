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
        const data = await VerificationService.generateAadhaarOtp(currentUser.id, aadhaarNumber);
        return { success: true, data };
    } catch (error) {
        console.error("[generateAadhaarOtpAction] Error:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to generate Aadhaar OTP",
        };
    }
}

// 3. Aadhaar OTP Verification (Cashfree)
export async function verifyAadhaarOtpAction(refId: string, otp: string) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser?.id) throw new Error("Unauthorized");
        const data = await VerificationService.verifyAadhaarOtp(currentUser.id, refId, otp);
        return { success: true, data };
    } catch (error) {
        console.error("[verifyAadhaarOtpAction] Error:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to verify Aadhaar OTP",
        };
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
