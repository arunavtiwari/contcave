import type { Prisma } from "@prisma/client";
import axios from "axios";
import crypto from "crypto";

import { cfEnsureVendor, cfSecureIdHeaders, cfVerificationBaseURL } from "@/lib/cashfree/cashfree";
import { getNonProductionEmailVerificationCode } from "@/lib/e2e-guards";
import { sendEmail } from "@/lib/email/mailer";
import { getEmailVerificationCodeTemplate, getHostOnboardingTemplate } from "@/lib/email/templates";
import { UserFacingError } from "@/lib/errors";
import { getFixieProxyAgent } from "@/lib/fixie-proxy";
import { upsertPaymentDetailsSafe } from "@/lib/payment-details";
import { normalizePhone } from "@/lib/phone";
import prisma from "@/lib/prismadb";
import { UserRole } from "@/types/user";

const verificationUserSelect = {
    id: true,
    name: true,
    email: true,
    phone: true,
    role: true,
    image: true,
    profileImage: true,
    phone_verified: true,
    email_verified: true,
    aadhaar_verified: true,
    bank_verified: true,
    bank_verified_name: true,
    is_verified: true,
    verified_at: true,
} as const;

type VerificationUserRecord = Prisma.UserGetPayload<{ select: typeof verificationUserSelect }>;

function serializeVerificationUser(user: VerificationUserRecord) {
    return {
        ...user,
        verified_at: user.verified_at?.toISOString() || null,
    };
}

const AADHAAR_OCR_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const AADHAAR_OCR_PDF_MAX_BYTES = 5 * 1024 * 1024;
const AADHAAR_OCR_ALLOWED_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "application/pdf"]);
const CASHFREE_SMART_OCR_API_VERSION = "2024-12-01";
const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const EMAIL_CODE_TTL_MS = 10 * 60 * 1000;

function emailCodeSecret() {
    const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
    if (!secret) throw new Error("Server configuration error (AUTH_SECRET)");
    return secret;
}

function hashEmailCode(userId: string, email: string, code: string) {
    return crypto.createHmac("sha256", emailCodeSecret())
        .update(`${userId}:${email.toLowerCase()}:${code}`)
        .digest("hex");
}

function secureCodeMatches(expectedHex: string, actualHex: string) {
    const expected = Buffer.from(expectedHex, "hex");
    const actual = Buffer.from(actualHex, "hex");
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

type SmartOcrResponse = {
    verification_id?: string;
    reference_id?: string | number;
    status?: string;
    document_type?: string;
    document_fields?: Record<string, unknown>;
    quality_checks?: Record<string, unknown>;
    fraud_checks?: Record<string, unknown>;
    qr_details?: Record<string, unknown>;
};

function assertAadhaarOcrFile(file: File) {
    if (!file || typeof file.arrayBuffer !== "function") {
        throw new Error("Aadhaar document is required");
    }

    if (!AADHAAR_OCR_ALLOWED_TYPES.has(file.type)) {
        throw new Error("Upload a JPG, PNG, or PDF Aadhaar document");
    }

    const maxBytes = file.type === "application/pdf" ? AADHAAR_OCR_PDF_MAX_BYTES : AADHAAR_OCR_IMAGE_MAX_BYTES;
    if (file.size > maxBytes) {
        throw new Error(file.type === "application/pdf" ? "Aadhaar PDF must be 1 MB or smaller" : "Aadhaar image must be 5 MB or smaller");
    }
}

function sanitizeVerificationId(userId: string) {
    return `aadhaar_${userId}_${Date.now()}`.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 50);
}

function safeAadhaarFilename(verificationId: string, fileType: string) {
    const extension = fileType === "application/pdf" ? "pdf" : fileType === "image/png" ? "png" : "jpg";
    return `${verificationId.replace(/[^a-zA-Z0-9_-]/g, "_")}.${extension}`;
}

function valueStrings(input: unknown): string[] {
    if (input == null) return [];
    if (typeof input === "string" || typeof input === "number") return [String(input)];
    if (Array.isArray(input)) return input.flatMap(valueStrings);
    if (typeof input === "object") return Object.values(input as Record<string, unknown>).flatMap(valueStrings);
    return [];
}

function extractAadhaarLast4(response: SmartOcrResponse) {
    const candidates = valueStrings([response.document_fields, response.qr_details]);
    for (const candidate of candidates) {
        const digits = candidate.replace(/\D/g, "");
        if (digits.length === 4 || digits.length === 12) {
            return digits.slice(-4);
        }
    }
    return null;
}

function assertSmartOcrAccepted(response: SmartOcrResponse) {
    const status = String(response.status || "").toUpperCase();
    const documentType = String(response.document_type || "").toUpperCase();
    const fraudChecks = response.fraud_checks || {};

    if (documentType && documentType !== "AADHAAR" && !documentType.startsWith("AADHAAR_")) {
        throw new Error("Uploaded document is not an Aadhaar document");
    }

    if (status !== "VALID" && status !== "SUCCESS") {
        throw new Error("Aadhaar OCR verification failed. Upload a clear Aadhaar document and try again");
    }

    if (["is_forged", "is_overwritten", "is_photo_imposed"].some((key) => fraudChecks[key] === true)) {
        throw new Error("Aadhaar document failed authenticity checks");
    }
}

function cashfreeOcrError(error: unknown) {
    if (!axios.isAxiosError(error)) return error instanceof Error ? error : new Error("Aadhaar OCR verification failed");

    const status = error.response?.status;
    const data = error.response?.data as { code?: string; message?: string } | undefined;
    console.error("[Verification] Aadhaar OCR upstream failed", {
        status,
        code: data?.code,
        message: data?.message,
    });

    if (status === 401 || status === 403 || status === 404) {
        return new Error("Aadhaar verification is temporarily unavailable. Please contact support if this continues");
    }

    if (status === 413) {
        return new Error("Aadhaar document is too large. Upload an image up to 5 MB or a PDF up to 1 MB");
    }

    if (status === 429) {
        return new Error("Aadhaar verification is busy. Please wait a moment and try again");
    }

    if (!status || status >= 500 || error.code === "ECONNABORTED") {
        return new Error("Aadhaar verification service is temporarily unavailable. Please try again");
    }

    return new Error(data?.message || "Aadhaar OCR verification failed. Check the document and try again");
}

function asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function trimmedString(value: unknown) {
    if (typeof value !== "string") return "";
    const trimmed = value.trim();
    return trimmed === "$undefined" || trimmed === "$null" ? "" : trimmed;
}

function normalizeVendorPayload(userId: string, payload: Record<string, unknown>, user: {
    name: string | null;
    email: string | null;
    phone: string | null;
}) {
    const bank = asRecord(payload.bank);
    const accountHolder = trimmedString(bank.account_holder) || trimmedString(payload.account_holder);
    const accountNumber = (trimmedString(bank.account_number) || trimmedString(payload.account_number)).replace(/\D/g, "");
    const ifsc = (trimmedString(bank.ifsc) || trimmedString(payload.ifsc)).toUpperCase();
    const gstin = trimmedString(payload.gstin) || trimmedString(asRecord(payload.kyc_details).gst);
    const phone = normalizePhone(trimmedString(payload.phone) || user.phone || "");

    if (!accountHolder) throw new Error("Account holder name is required");
    if (!/^\d{9,20}$/.test(accountNumber)) throw new Error("Account number must be between 9 and 20 digits");
    if (!IFSC_PATTERN.test(ifsc)) throw new Error("Invalid IFSC code");

    return {
        vendor_id: `v_${userId}`.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 50),
        display_name: trimmedString(payload.display_name) || trimmedString(payload.name) || user.name || accountHolder,
        email: trimmedString(payload.email) || user.email || undefined,
        phone: phone || undefined,
        account_holder: accountHolder,
        account_number: accountNumber,
        ifsc,
        gstin: gstin || undefined,
    };
}

export class VerificationService {
    static async requestEmailVerificationCode(userId: string, email: string) {
        const normalizedEmail = email.trim().toLowerCase();
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, name: true, email_verified: true },
        });
        if (!user) throw new UserFacingError("User not found", 404);
        if (!user.email || user.email.toLowerCase() !== normalizedEmail) {
            throw new UserFacingError("Verify the email address associated with your account.");
        }
        if (user.email_verified) {
            const verifiedUser = await prisma.user.findUniqueOrThrow({
                where: { id: user.id },
                select: verificationUserSelect,
            });
            return { alreadyVerified: true, user: serializeVerificationUser(verifiedUser) };
        }

        const nonProductionCode = getNonProductionEmailVerificationCode();
        const code = nonProductionCode || crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
        const codeHash = hashEmailCode(user.id, normalizedEmail, code);
        await prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerificationCodeHash: codeHash,
                emailVerificationCodeExpiry: new Date(Date.now() + EMAIL_CODE_TTL_MS),
            },
        });

        try {
            await sendEmail({
                toEmail: normalizedEmail,
                toName: user.name || "",
                subject: "Your ContCave email verification code",
                html: getEmailVerificationCodeTemplate(user.name || "there", code),
            });
        } catch (error) {
            await prisma.user.updateMany({
                where: { id: user.id, emailVerificationCodeHash: codeHash },
                data: { emailVerificationCodeHash: null, emailVerificationCodeExpiry: null },
            }).catch(() => undefined);
            throw error;
        }

        return {
            alreadyVerified: false,
            ...(nonProductionCode ? { developmentCode: code } : {}),
        };
    }

    static async confirmEmailVerificationCode(userId: string, code: string) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                email_verified: true,
                emailVerificationCodeHash: true,
                emailVerificationCodeExpiry: true,
                verification_stage: true,
            },
        });
        if (!user) throw new UserFacingError("User not found", 404);
        if (user.email_verified) {
            const verifiedUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: verificationUserSelect });
            return serializeVerificationUser(verifiedUser);
        }
        if (!user.email || !user.emailVerificationCodeHash || !user.emailVerificationCodeExpiry) {
            throw new UserFacingError("Request a new verification code first.");
        }
        if (user.emailVerificationCodeExpiry.getTime() <= Date.now()) {
            await prisma.user.update({
                where: { id: user.id },
                data: { emailVerificationCodeHash: null, emailVerificationCodeExpiry: null },
            });
            throw new UserFacingError("The verification code has expired. Request a new code.");
        }

        const candidateHash = hashEmailCode(user.id, user.email, code.trim());
        if (!secureCodeMatches(user.emailVerificationCodeHash, candidateHash)) {
            throw new UserFacingError("The verification code is incorrect.");
        }

        const confirmed = await prisma.user.updateMany({
            where: {
                id: user.id,
                email_verified: false,
                emailVerificationCodeHash: user.emailVerificationCodeHash,
            },
            data: {
                email_verified: true,
                emailVerified: new Date(),
                emailVerificationCodeHash: null,
                emailVerificationCodeExpiry: null,
                verified_via: { push: "email_otp" },
                verification_stage: Math.max(user.verification_stage || 0, 1),
            },
        });
        if (confirmed.count !== 1) {
            const latest = await prisma.user.findUnique({ where: { id: user.id }, select: { email_verified: true } });
            if (!latest?.email_verified) throw new UserFacingError("Request a new verification code and try again.");
        }
        const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: verificationUserSelect });
        return await this.finalizeVerificationIfComplete(user.id, updated);
    }

    static async verifyAadhaarOcr(userId: string, file: File) {
        assertAadhaarOcrFile(file);

        const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
        if (!user) throw new Error("User not found");

        const verificationId = sanitizeVerificationId(userId);
        const body = new FormData();
        const buffer = await file.arrayBuffer();
        body.append("verification_id", verificationId);
        body.append("document_type", "AADHAAR");
        body.append("do_verification", "false");
        body.append(
            "file",
            new Blob([new Uint8Array(buffer)], { type: file.type }),
            safeAadhaarFilename(verificationId, file.type)
        );

        let response: SmartOcrResponse;
        try {
            const resp = await axios.post<SmartOcrResponse>(
                `${cfVerificationBaseURL()}/bharat-ocr`,
                body,
                {
                    headers: cfSecureIdHeaders(CASHFREE_SMART_OCR_API_VERSION),
                    httpsAgent: getFixieProxyAgent(),
                    timeout: 45000,
                }
            );
            response = resp.data;
        } catch (error) {
            throw cashfreeOcrError(error);
        }

        assertSmartOcrAccepted(response);
        const referenceId = String(response.reference_id || verificationId);
        const last4 = extractAadhaarLast4(response);
        const updatedUser = await this.markAadhaarVerified(userId, referenceId, last4);

        return {
            user: updatedUser,
            status: response.status,
        };
    }

    static async createVendor(userId: string, payload: Record<string, unknown>) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { name: true, email: true, phone: true },
        });
        if (!user) throw new Error("User not found");

        const normalized = normalizeVendorPayload(userId, payload, user);
        const vendorId = await cfEnsureVendor(normalized);

        return { vendor_id: vendorId };
    }

    private static async markAadhaarVerified(userId: string, referenceId: string, last4: string | null) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new Error("User not found");

        const updated = await prisma.user.update({
            where: { id: userId },
            data: {
                aadhaar_verified: true,
                aadhaar_ref_id: referenceId,
                aadhaar_last4: last4 || undefined,
                verified_via: { push: "aadhaar_smart_ocr" },
                verification_stage: Math.max(user.verification_stage || 0, 2),
            },
            select: verificationUserSelect,
        });

        return await this.finalizeVerificationIfComplete(userId, updated);
    }

    static async updateStep(userId: string, data: Record<string, unknown>) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new Error("User not found");

        const updates: Record<string, unknown> = {};

        if (data.step === "phone" && data.phone) {
            const normalized = normalizePhone(data.phone as string);
            if (!normalized) throw new UserFacingError("Enter a valid 10-digit phone number.");
            updates.phone = normalized;
            updates.phone_verified = true;
            updates.verified_via = { push: "phone_profile_capture" };
        }

        if (data.step === "aadhaar") {
            throw new Error("Aadhaar verification must be completed through Smart OCR");
        }

        if (data.step === "bank" && data.bankVerifiedName && data.accountNumber && data.ifscCode) {
            const vendorId = trimmedString(data.vendorId);
            if (!vendorId) {
                throw new Error("Payout setup did not complete. Please try bank verification again.");
            }

            updates.bank_verified = true;
            updates.bank_verified_name = (data.bankVerifiedName as string).trim();
            updates.verified_via = { push: "bank_verification" };
            const gstin = trimmedString(data.gstin);
            const companyName = trimmedString(data.companyName);

            const paymentResult = await upsertPaymentDetailsSafe({
                userId,
                accountHolderName: (data.bankVerifiedName as string).trim(),
                bankName: (data.bankName as string) || "Unknown",
                accountNumber: (data.accountNumber as string).trim(),
                ifscCode: (data.ifscCode as string).trim(),
                companyName: companyName || undefined,
                gstin: gstin || undefined,
                cashfreeVendorId: vendorId,
            });

            if (!paymentResult.success) throw new Error(paymentResult.error || "Failed to save payment details");
        }

        const currentStage = user.verification_stage || 0;
        if (data.step === "phone") updates.verification_stage = Math.max(currentStage, 1);
        else if (data.step === "bank") updates.verification_stage = Math.max(currentStage, 3);

        const updated = await prisma.user.update({
            where: { id: userId },
            data: updates,
            select: verificationUserSelect,
        });

        return await this.finalizeVerificationIfComplete(userId, updated);
    }

    private static async finalizeVerificationIfComplete(userId: string, updated: VerificationUserRecord) {
        if (updated.phone_verified && updated.email_verified && updated.aadhaar_verified && updated.bank_verified && !updated.is_verified) {
            const finalUser = await prisma.user.update({
                where: { id: userId },
                data: { is_verified: true, verified_at: new Date() },
                select: verificationUserSelect,
            });

            if (finalUser.role === UserRole.OWNER || finalUser.role === UserRole.ADMIN) {
                sendEmail({
                    toEmail: finalUser.email || "",
                    toName: finalUser.name || "Host",
                    subject: "Welcome to ContCave!",
                    html: getHostOnboardingTemplate(finalUser.name || "Host")
                }).catch(err => console.error("[Verification] Failed to send onboarding email:", err));
            }

            return serializeVerificationUser(finalUser);
        }

        return serializeVerificationUser(updated);
    }
}
