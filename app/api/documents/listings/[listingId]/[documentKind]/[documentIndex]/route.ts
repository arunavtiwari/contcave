import getCurrentUser from "@/app/actions/getCurrentUser";
import { createErrorResponse, handleRouteError } from "@/lib/api-utils";
import prisma from "@/lib/prismadb";
import { createPrivateDocumentDownloadUrl } from "@/lib/storage/privateDocuments";
import { UserRole } from "@/types/user";

type Params = {
  listingId?: string;
  documentKind?: string;
  documentIndex?: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export async function GET(_request: Request, props: { params: Promise<Params> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser?.id) return createErrorResponse("Authentication required", 401);

    const { listingId, documentKind, documentIndex } = await props.params;
    if (!listingId || !/^[a-f\d]{24}$/i.test(listingId)) return createErrorResponse("Invalid listing ID", 400);
    if (documentKind !== "verification" && documentKind !== "agreement") {
      return createErrorResponse("Invalid document type", 400);
    }
    const index = Number(documentIndex);
    if (!Number.isSafeInteger(index) || index < 0 || index > 19) return createErrorResponse("Invalid document index", 400);

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { userId: true, verifications: true },
    });
    if (!listing || (listing.userId !== currentUser.id && currentUser.role !== UserRole.ADMIN)) {
      return createErrorResponse("Document not found", 404);
    }

    const verifications = asRecord(listing.verifications);
    let document: Record<string, unknown>;
    if (documentKind === "agreement") {
      document = asRecord(verifications.agreementPdf);
    } else {
      const documents = Array.isArray(verifications.documents) ? verifications.documents : [];
      document = asRecord(documents[index]);
    }

    const ref = typeof document.storageRef === "string"
      ? document.storageRef
      : typeof document.pdfUrl === "string"
        ? document.pdfUrl
        : typeof document.url === "string"
          ? document.url
          : null;
    if (!ref) return createErrorResponse("Document not found", 404);

    const filename = documentKind === "agreement"
      ? `ContCave-agreement-${listingId}.pdf`
      : (typeof document.original_filename === "string" ? document.original_filename : `verification-${index + 1}.pdf`);
    const signedUrl = await createPrivateDocumentDownloadUrl(ref, filename);
    const response = Response.redirect(signedUrl, 302);
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  } catch (error) {
    return handleRouteError(error, "GET private listing document");
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
