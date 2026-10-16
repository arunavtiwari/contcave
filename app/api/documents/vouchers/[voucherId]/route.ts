import getCurrentUser from "@/app/actions/getCurrentUser";
import { createErrorResponse, handleRouteError } from "@/lib/api-utils";
import prisma from "@/lib/prismadb";
import { readPrivateDocument, safeDownloadName } from "@/lib/storage/privateDocuments";
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
        reservation: {
          select: {
            userId: true,
            listing: {
              select: {
                userId: true,
              },
            },
          },
        },
      },
    });
    const allowed = voucher && (
      currentUser.role === UserRole.ADMIN
      || voucher.userId === currentUser.id
      || voucher.reservation?.userId === currentUser.id
      || voucher.reservation?.listing?.userId === currentUser.id
    );
    if (!allowed || !voucher.voucherUrl) return createErrorResponse("Voucher not found", 404);

    if (voucher.voucherUrl.startsWith("http://") || voucher.voucherUrl.startsWith("https://")) {
      return Response.redirect(voucher.voucherUrl, 302);
    }

    const buffer = await readPrivateDocument(voucher.voucherUrl);
    const filename = `${safeDownloadName(voucher.voucherNumber)}.pdf`;

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    return handleRouteError(error, "GET private voucher");
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
