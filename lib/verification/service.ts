
import axios from "axios";

import { cfSplitBaseURL } from "@/lib/cashfree/cashfree";
import { sendEmail } from "@/lib/email/mailer";
import { getHostOnboardingTemplate } from "@/lib/email/templates";
import { getFixieProxyAgent } from "@/lib/fixie-proxy";
import { upsertPaymentDetailsSafe } from "@/lib/payment-details";
import { normalizePhone } from "@/lib/phone";
import prisma from "@/lib/prismadb";
import { aadhaarSchema, emailVerificationSchema, otpSchema } from "@/schemas/verification";
import { UserRole } from "@/types/user";

const httpsAgent = getFixieProxyAgent();

export class VerificationService {
    /**
     * Email Validation via MSG91
     */
    static async verifyUserStep(userId: string, step: string, data: Record<string, unknown>) {
        const updates: Record<string, unknown> = {};
        if (step === "email") {
            updates.email_verified = true;
            updates.verified_via = { push: "email_verification_msg91" };
        } else if (step === "phone") {
            updates.phone_verified = true;
            if (data.phone) updates.phone = data.phone;
            updates.verified_via = { push: "phone_otp" };
        } else if (step === "aadhaar") {
            updates.aadhaar_verified = true;
            updates.aadhaar_ref_id = data.aadhaarRefId;
            updates.verified_via = { push: "aadhaar_okyc" };
            if (data.aadhaarLast4) updates.aadhaar_last4 = data.aadhaarLast4;
        } else if (step === "bank") {
            updates.bank_verified = true;
            if (data.bankVerifiedName) updates.bank_verified_name = data.bankVerifiedName;
            updates.verified_via = { push: "bank_verification" };
        }

        const stages: Record<string, number> = { email: 1, phone: 1, aadhaar: 2, bank: 3 };
        const targetStage = stages[step];

        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                ...updates,
                verification_stage: { set: undefined } // Fallback logic below
            },
            select: {
                id: true,
                phone_verified: true,
                email_verified: true,
                aadhaar_verified: true,
                bank_verified: true,
                is_verified: true,
                verification_stage: true,
                role: true,
            }
        });

        // Atomic stage advancement
        if (targetStage && (user.verification_stage || 0) < targetStage) {
            await prisma.user.update({
                where: { id: userId },
                data: { verification_stage: targetStage }
            });
        }

        // Auto-certification (Legacy verifyUserStep)
        if (user.phone_verified && user.email_verified && user.aadhaar_verified && user.bank_verified && !user.is_verified) {
            const finalUser = await prisma.user.update({
                where: { id: userId },
                data: { is_verified: true, verified_at: new Date() }
            });

            // Send onboarding email ONLY to hosts after full verification
            if (finalUser.role === UserRole.OWNER || finalUser.role === UserRole.ADMIN) {
                sendEmail({
                    toEmail: finalUser.email || "",
                    toName: finalUser.name || "Host",
                    subject: "Welcome to ContCave!",
                    html: getHostOnboardingTemplate(finalUser.name || "Host")
                }).catch(err => console.error("[Verification] Failed to send onboarding email:", err));
            }

            return finalUser;
        }

        return user;
    }

    static async validateEmail(email: string) {
        const validation = emailVerificationSchema.safeParse({ email });
        if (!validation.success) throw new Error(validation.error.issues[0].message);

        const authKey = process.env.MSG91_AUTH_KEY;
        if (!authKey) throw new Error("Server configuration error (MSG91)");

        const resp = await axios.post(
            "https://control.msg91.com/api/v5/email/validate",
            { email: email.trim().toLowerCase() },
            {
                headers: { accept: "application/json", "content-type": "application/json", authkey: authKey },
                httpsAgent,
                timeout: 30000,
            }
        );
        return resp.data;
    }

    /**
     * Generate Aadhaar OTP via Cashfree
     */
    static async generateAadhaarOtp(userId: string, aadhaarNumber: string) {
        const validation = aadhaarSchema.safeParse({ aadhaarNumber });
        if (!validation.success) throw new Error(validation.error.issues[0].message);

        const clientId = process.env.CASHFREE_CLIENT_ID;
        const clientSecret = process.env.CASHFREE_CLIENT_SECRET;
        if (!clientId || !clientSecret) throw new Error("Server configuration error (Cashfree)");

        const resp = await axios.post(
            "https://api.cashfree.com/verification/offline-aadhaar/otp",
            { aadhaar_number: aadhaarNumber.replace(/\D/g, "") },
            {
                headers: { "Content-Type": "application/json", "x-client-id": clientId, "x-client-secret": clientSecret },
                httpsAgent,
                timeout: 30000,
            }
        );
        return resp.data;
    }

    /**
     * Verify Aadhaar OTP via Cashfree
     */
    static async verifyAadhaarOtp(userId: string, refId: string, otp: string) {
        const validation = otpSchema.safeParse({ refId, otp });
        if (!validation.success) throw new Error(validation.error.issues[0].message);

        const clientId = process.env.CASHFREE_CLIENT_ID;
        const clientSecret = process.env.CASHFREE_CLIENT_SECRET;
        if (!clientId || !clientSecret) throw new Error("Server configuration error (Cashfree)");

        const resp = await axios.post(
            "https://api.cashfree.com/verification/offline-aadhaar/verify",
            { ref_id: refId.trim(), otp: otp.trim() },
            {
                headers: { "Content-Type": "application/json", "x-client-id": clientId, "x-client-secret": clientSecret },
                httpsAgent,
                timeout: 30000,
            }
        );
        return resp.data;
    }

    /**
     * Create Cashfree Vendor for Splits
     */
    static async createVendor(userId: string, payload: Record<string, unknown>) {
        const appId = process.env.CASHFREE_APP_ID;
        const secret = process.env.CASHFREE_SECRET_KEY;
        if (!appId || !secret) throw new Error("Server configuration error (Cashfree Split)");

        const url = `${cfSplitBaseURL()}/vendors`;
        const resp = await axios.post(
            url,
            {
                ...payload,
                status: 'ACTIVE',
                verify_account: true,
                dashboard_access: false,
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    "x-client-id": appId,
                    "x-client-secret": secret,
                    "x-api-version": "2023-08-01",
                },
                httpsAgent,
                timeout: 30000,
            }
        );
        return resp.data;
    }

    /**
     * Advanced Multi-Step Verification Logic
     * Syncs user state, mapping stages, and enforcing completion rules.
     */
    static async updateStep(userId: string, data: Record<string, unknown>) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new Error("User not found");

        const updates: Record<string, unknown> = {};

        if (data.step === "email") {
            updates.email_verified = true;
            updates.verified_via = { push: "email_verification_msg91" };
        }
        if (data.step === "phone" && data.phone) {
            updates.phone_verified = true;
            const normalized = normalizePhone(data.phone as string);
            if (normalized) updates.phone = normalized;
            updates.verified_via = { push: "phone_otp" };
        }
        if (data.step === "aadhaar" && data.aadhaarRefId) {
            updates.aadhaar_verified = true;
            updates.aadhaar_ref_id = data.aadhaarRefId;
            updates.verified_via = { push: "aadhaar_okyc" };
            if (data.aadhaarLast4) updates.aadhaar_last4 = data.aadhaarLast4;
        }
        if (data.step === "bank" && data.bankVerifiedName && data.accountNumber && data.ifscCode) {
            updates.bank_verified = true;
            updates.bank_verified_name = (data.bankVerifiedName as string).trim();
            updates.verified_via = { push: "bank_verification" };

            const paymentResult = await upsertPaymentDetailsSafe({
                userId,
                accountHolderName: (data.bankVerifiedName as string).trim(),
                bankName: (data.bankName as string) || "Unknown",
                accountNumber: (data.accountNumber as string).trim(),
                ifscCode: (data.ifscCode as string).trim(),
                companyName: data.companyName as string,
                gstin: data.gstin as string,
                cashfreeVendorId: data.vendorId as string,
            });

            if (!paymentResult.success) throw new Error(paymentResult.error || "Failed to save payment details");
        }

        const currentStage = user.verification_stage || 0;
        if (data.step === "email" || data.step === "phone") updates.verification_stage = Math.max(currentStage, 1);
        else if (data.step === "aadhaar") updates.verification_stage = Math.max(currentStage, 2);
        else if (data.step === "bank") updates.verification_stage = Math.max(currentStage, 3);

        const updated = await prisma.user.update({
            where: { id: userId },
            data: updates,
            select: {
                id: true,
                phone_verified: true,
                email_verified: true,
                aadhaar_verified: true,
                bank_verified: true,
                is_verified: true,
                verification_stage: true,
                aadhaar_last4: true,
                phone: true,
                email: true,
                role: true,
            }
        });

        // Atomic completion check
        if (updated.phone_verified && updated.email_verified && updated.aadhaar_verified && updated.bank_verified && !updated.is_verified) {
            const finalUser = await prisma.user.update({
                where: { id: userId },
                data: { is_verified: true, verified_at: new Date() }
            });

            // Send onboarding email ONLY to hosts after full verification
            if (finalUser.role === UserRole.OWNER || finalUser.role === UserRole.ADMIN) {
                sendEmail({
                    toEmail: finalUser.email || "",
                    toName: finalUser.name || "Host",
                    subject: "Welcome to ContCave!",
                    html: getHostOnboardingTemplate(finalUser.name || "Host")
                }).catch(err => console.error("[Verification] Failed to send onboarding email:", err));
            }

            return finalUser;
        }

        return updated;
    }
}
