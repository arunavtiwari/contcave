import getCurrentUser from "@/app/actions/getCurrentUser";
import { createErrorResponse, handleRouteError } from "@/lib/api-utils";
import prisma from "@/lib/prismadb";
import { canReadBookingDocument, DOCUMENT_PARTIES, privatePdfResponse } from "@/lib/storage/privatePdfResponse";

export async function GET(request: Request, props: { params: Promise<{ invoiceId?: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser?.id) return createErrorResponse("Authentication required", 401);
    const { invoiceId } = await props.params;
    if (!invoiceId || !/^[a-f\d]{24}$/i.test(invoiceId)) return createErrorResponse("Invalid invoice ID", 400);

    const document = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: { ...DOCUMENT_PARTIES, invoiceNumber: true, invoiceUrl: true },
    });
    if (!canReadBookingDocument(currentUser, document) || !document?.invoiceUrl) {
      return createErrorResponse("Invoice not found", 404);
    }

    return await privatePdfResponse(request, document.invoiceUrl, document.invoiceNumber);
  } catch (error) {
    return handleRouteError(error, "GET private invoice");
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
