import { NextRequest } from "next/server";
import { z } from "zod";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { createErrorResponse, createSuccessResponse, handleRouteError, readJsonObject } from "@/lib/api-utils";
import { cfEnsureVendor } from "@/lib/cashfree/cashfree";
import prisma from "@/lib/prismadb";
import { isOwner } from "@/lib/user/permissions";
import { ensureVendorSchema } from "@/schemas/cashfree";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";


export async function POST(req: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser?.id) {
            return createErrorResponse("Unauthorized", 401);
        }
        if (!isOwner(currentUser.role)) {
            return createErrorResponse("Only owners can create payout vendors", 403);
        }

        const parsedBody = await readJsonObject(req, 5_000);
        if (!parsedBody.success) return parsedBody.response;
        const body = parsedBody.data;
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
                email_verified: true,
                phone_verified: true,
                aadhaar_verified: true,
                bank_verified: true,
                paymentDetails: true,
            },
        });

        if (!user) {
            return createErrorResponse("User not found", 404);
        }

        if (!user.paymentDetails) {
            return createErrorResponse("Payment details must be set up before creating a vendor", 400);
        }

        if (!user.email_verified || !user.phone_verified || !user.aadhaar_verified || !user.bank_verified) {
            return createErrorResponse("Complete email, phone, Aadhaar, and bank verification before payout onboarding", 400);
        }

        if (!user.paymentDetails.accountHolderName || !user.paymentDetails.accountNumber || !user.paymentDetails.ifscCode) {
            return createErrorResponse("Complete payment details (account holder, account number, IFSC) are required", 400);
        }

        const { decryptPaymentDetailsInternal } = await import('@/lib/payment-details');
        const decryptedDetails = decryptPaymentDetailsInternal(user.paymentDetails);
        if (decryptedDetails.cashfreeVendorId) {
            return createSuccessResponse({ ensured: true });
        }

        const vendorId = await cfEnsureVendor({
            vendor_id: `v_${userId}`,
            display_name: (user.name || "Vendor").trim().slice(0, 100),
            email: user.email || undefined,
            phone: user.phone || undefined,
            account_holder: user.paymentDetails.accountHolderName.trim(),
            account_number: decryptedDetails.accountNumber.trim(),
            ifsc: decryptedDetails.ifscCode.trim().toUpperCase(),
            gstin: decryptedDetails.gstin || undefined,
        });

        const { encryptionService } = await import('@/lib/security/encryption');
        const encryptedVendor = encryptionService.encrypt(vendorId);

        await prisma.paymentDetails.update({
            where: { id: user.paymentDetails.id },
            data: {
                cashfreeVendorId: encryptedVendor.encrypted,
                vendorIdIV: encryptedVendor.iv,
                encryptionVersion: encryptionService.getKeyVersion(),
            },
        });


        return createSuccessResponse({ ensured: true });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return createErrorResponse("Invalid request body", 400, { issues: error.issues });
        }
        return handleRouteError(error, "POST /api/payments/cashfree/vendors/ensure");
    }
}
