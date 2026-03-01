import { NextRequest } from "next/server";
import { z } from "zod";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";
import { cfEnsureVendor } from "@/lib/cashfree/cashfree";
import prisma from "@/lib/prismadb";
import { ensureVendorSchema } from "@/lib/schemas/cashfree";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";


export async function POST(req: NextRequest) {
    try {
        if (!req.headers.get("content-type")?.includes("application/json")) {
            return createErrorResponse("Content-Type must be application/json", 415);
        }

        const currentUser = await getCurrentUser();
        if (!currentUser?.id) {
            return createErrorResponse("Unauthorized", 401);
        }

        const body = await req.json().catch(() => ({}));
        const parsed = ensureVendorSchema.safeParse(body);

        if (!parsed.success) {
            return createErrorResponse("Invalid request body", 400, { issues: parsed.error.issues });
        }

        const { userId } = parsed.data;

        if (userId !== currentUser.id) {
            return createErrorResponse("You can only create vendors for your own account", 403);
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                paymentDetails: {
                    select: {
                        id: true,
                        cashfreeVendorId: true,
                        accountHolderName: true,
                        accountNumber: true,
                        accountNumberIV: true,
                        ifscCode: true,
                        ifscCodeIV: true,
                    },
                },
            },
        });

        if (!user) {
            return createErrorResponse("User not found", 404);
        }

        if (!user.paymentDetails) {
            return createErrorResponse("Payment details must be set up before creating a vendor", 400);
        }

        if (user.paymentDetails.cashfreeVendorId) {
            return createSuccessResponse({ vendorId: user.paymentDetails.cashfreeVendorId });
        }

        if (!user.paymentDetails.accountHolderName || !user.paymentDetails.accountNumber || !user.paymentDetails.ifscCode) {
            return createErrorResponse("Complete payment details (account holder, account number, IFSC) are required", 400);
        }

        let accountNumber = user.paymentDetails.accountNumber;
        if (user.paymentDetails.accountNumberIV) {
            try {
                const { encryptionService } = await import('@/lib/security/encryption');
                accountNumber = encryptionService.decrypt({
                    encrypted: user.paymentDetails.accountNumber,
                    iv: user.paymentDetails.accountNumberIV
                });
            } catch (error) {
                console.error('Failed to decrypt account number directly for Cashfree:', error);
                return createErrorResponse("Failed to read secure payment details", 500);
            }
        }

        let ifscCode = user.paymentDetails.ifscCode;
        if (user.paymentDetails.ifscCodeIV) {
            try {
                const { encryptionService } = await import('@/lib/security/encryption');
                ifscCode = encryptionService.decrypt({
                    encrypted: user.paymentDetails.ifscCode,
                    iv: user.paymentDetails.ifscCodeIV
                });
            } catch (error) {
                console.error('Failed to decrypt IFSC Code directly for Cashfree:', error);
                return createErrorResponse("Failed to read secure payment details", 500);
            }
        }

        const vendorId = await cfEnsureVendor({
            vendor_id: `v_${userId}`,
            display_name: (user.name || "Vendor").trim().slice(0, 100),
            email: user.email || undefined,
            phone: user.phone || undefined,
            account_holder: user.paymentDetails.accountHolderName.trim(),
            account_number: accountNumber.trim(),
            ifsc: ifscCode.trim().toUpperCase(),
        });

        await prisma.paymentDetails.update({
            where: { id: user.paymentDetails.id },
            data: { cashfreeVendorId: vendorId },
        });

        return createSuccessResponse({ vendorId });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return createErrorResponse("Invalid request body", 400, { issues: error.issues });
        }
        return handleRouteError(error, "POST /api/payments/cashfree/vendors/ensure");
    }
}
