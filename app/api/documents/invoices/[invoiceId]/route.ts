import getCurrentUser from "@/app/actions/getCurrentUser";
import { createErrorResponse, handleRouteError } from "@/lib/api-utils";
import prisma from "@/lib/prismadb";
import { readPrivateDocument, safeDownloadName } from "@/lib/storage/privateDocuments";
import { UserRole } from "@/types/user";

export async function GET(_request: Request, props: { params: Promise<{ invoiceId?: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser?.id) return createErrorResponse("Authentication required", 401);
    const { invoiceId } = await props.params;
    if (!invoiceId || !/^[a-f\d]{24}$/i.test(invoiceId)) return createErrorResponse("Invalid invoice ID", 400);

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        userId: true,
        invoiceNumber: true,
        invoiceUrl: true,
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
    const allowed = invoice && (
      currentUser.role === UserRole.ADMIN
      || invoice.userId === currentUser.id
      || invoice.reservation?.userId === currentUser.id
      || invoice.reservation?.listing?.userId === currentUser.id
    );
    if (!allowed || !invoice.invoiceUrl) return createErrorResponse("Invoice not found", 404);

    if (invoice.invoiceUrl.startsWith("http://") || invoice.invoiceUrl.startsWith("https://")) {
      return Response.redirect(invoice.invoiceUrl, 302);
    }

    const buffer = await readPrivateDocument(invoice.invoiceUrl);
    const filename = `${safeDownloadName(invoice.invoiceNumber)}.pdf`;

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    return handleRouteError(error, "GET private invoice");
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
