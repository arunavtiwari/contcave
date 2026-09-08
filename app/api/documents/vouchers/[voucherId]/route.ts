import getCurrentUser from "@/app/actions/getCurrentUser";
import { createErrorResponse, handleRouteError } from "@/lib/api-utils";
import prisma from "@/lib/prismadb";
import { createPrivateDocumentDownloadUrl } from "@/lib/storage/privateDocuments";
import { UserRole } from "@/types/user";

export async function GET(_request: Request, props: { params: Promise<{ voucherId?: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser?.id) return createErrorResponse("Authentication required", 401);
    const { voucherId } = await props.params;
    if (!voucherId || !/^[a-f\d]{24}$/i.test(voucherId)) return createErrorResponse("Invalid voucher ID", 400);

    const voucher = await prisma.paymentVoucher.findUnique({
      where: { id: voucherId },
      select: {
        userId: true,
        voucherNumber: true,
        voucherUrl: true,
      },
    });
    const allowed = voucher && (
      currentUser.role === UserRole.ADMIN
      || voucher.userId === currentUser.id
    );
    if (!allowed || !voucher.voucherUrl) return createErrorResponse("Voucher not found", 404);

    const signedUrl = await createPrivateDocumentDownloadUrl(voucher.voucherUrl, `${voucher.voucherNumber}.pdf`);
    const response = Response.redirect(signedUrl, 302);
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  } catch (error) {
    return handleRouteError(error, "GET private voucher");
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
