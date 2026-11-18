import "server-only";

import { can } from "@/lib/user/permissions";
import type { UserRole } from "@/types/user";

import { readPrivateDocument, safeDownloadName } from "./privateDocuments";

/** Prisma `select` for the people a booking document belongs to. */
export const DOCUMENT_PARTIES = {
    userId: true,
    reservation: { select: { userId: true, listing: { select: { userId: true } } } },
} as const;

type DocumentParties = {
    userId: string;
    reservation: { userId: string; listing: { userId: string } | null } | null;
} | null;

/** Finance staff and admins, the document's owner, the guest and the host may read a booking document. */
export function canReadBookingDocument(viewer: { id: string; role: UserRole }, document: DocumentParties) {
    if (!document) return false;
    return can(viewer.role, "documents.view")
        || document.userId === viewer.id
        || document.reservation?.userId === viewer.id
        || document.reservation?.listing?.userId === viewer.id;
}

/** Streams a stored PDF; `?download=1` saves it instead of opening it in the browser. */
export async function privatePdfResponse(request: Request, storedUrl: string, documentNumber: string) {
    if (storedUrl.startsWith("http://") || storedUrl.startsWith("https://")) {
        return Response.redirect(storedUrl, 302);
    }

    const buffer = await readPrivateDocument(storedUrl);
    const disposition = new URL(request.url).searchParams.get("download") === "1" ? "attachment" : "inline";

    return new Response(new Uint8Array(buffer), {
        status: 200,
        headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `${disposition}; filename="${safeDownloadName(documentNumber)}.pdf"`,
            "Cache-Control": "private, no-cache, no-store, must-revalidate",
        },
    });
}
