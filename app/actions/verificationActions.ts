"use server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { VerificationService } from "@/lib/verification/service";

export async function verifyEmailAction(email: string) {
    try {
        return await VerificationService.validateEmail(email);
    } catch (error) {
        console.error("[verifyEmailAction] Error:", error);
        throw error;
    }
}

export async function verifyAadhaarOcrAction(formData: FormData) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser?.id) throw new Error("Unauthorized");

        const file = formData.get("aadhaarDocument");
        if (!(file instanceof File)) throw new Error("Aadhaar document is required");

        const data = await VerificationService.verifyAadhaarOcr(currentUser.id, file);
        return { success: true, data };
    } catch (error) {
        console.error("[verifyAadhaarOcrAction] Error:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to verify Aadhaar document",
        };
    }
}

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

export async function updateVerificationStepAction(data: {
    step: "email" | "phone" | "bank";
    phone?: string;
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
