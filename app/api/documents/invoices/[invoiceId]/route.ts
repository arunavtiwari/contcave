import getCurrentUser from "@/app/actions/getCurrentUser";
import { createErrorResponse, handleRouteError } from "@/lib/api-utils";
import prisma from "@/lib/prismadb";
import { createPrivateDocumentDownloadUrl } from "@/lib/storage/privateDocuments";
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
      },
    });
    const allowed = invoice && (
      currentUser.role === UserRole.ADMIN
      || invoice.userId === currentUser.id
    );
    if (!allowed || !invoice.invoiceUrl) return createErrorResponse("Invoice not found", 404);

    const signedUrl = await createPrivateDocumentDownloadUrl(invoice.invoiceUrl, `${invoice.invoiceNumber}.pdf`);
    const response = Response.redirect(signedUrl, 302);
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  } catch (error) {
    return handleRouteError(error, "GET private invoice");
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
