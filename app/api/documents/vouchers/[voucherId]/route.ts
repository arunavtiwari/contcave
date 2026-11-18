import getCurrentUser from "@/app/actions/getCurrentUser";
import { createErrorResponse, handleRouteError } from "@/lib/api-utils";
import prisma from "@/lib/prismadb";
import { canReadBookingDocument, DOCUMENT_PARTIES, privatePdfResponse } from "@/lib/storage/privatePdfResponse";

export async function GET(request: Request, props: { params: Promise<{ voucherId?: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser?.id) return createErrorResponse("Authentication required", 401);
    const { voucherId } = await props.params;
    if (!voucherId || !/^[a-f\d]{24}$/i.test(voucherId)) return createErrorResponse("Invalid voucher ID", 400);

    const document = await prisma.paymentVoucher.findUnique({
      where: { id: voucherId },
      select: { ...DOCUMENT_PARTIES, voucherNumber: true, voucherUrl: true },
    });
    if (!canReadBookingDocument(currentUser, document) || !document?.voucherUrl) {
      return createErrorResponse("Voucher not found", 404);
    }

    return await privatePdfResponse(request, document.voucherUrl, document.voucherNumber);
  } catch (error) {
    return handleRouteError(error, "GET private voucher");
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
