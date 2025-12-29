import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/lib/prismadb";
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";

export const runtime = "nodejs";

interface IParams { listingId?: string }

type PackageInput = {
  id?: string;
  title: unknown;
  originalPrice?: unknown;
  offeredPrice: unknown;
  features?: unknown;
  durationHours: unknown;
};

export async function PATCH(request: Request, props: { params: Promise<IParams> }) {
  try {
    if (!request.headers.get("content-type")?.includes("application/json")) {
      return createErrorResponse("Content-Type must be application/json", 415);
    }

    const { listingId } = await props.params;
    const currentUser = await getCurrentUser();

    if (!currentUser?.id) {
      return createErrorResponse("Authentication required", 401);
    }

    if (!listingId || typeof listingId !== "string" || listingId.trim().length === 0) {
      return createErrorResponse("Invalid listing ID", 400);
    }

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { userId: true },
    });

    if (!listing) {
      return createErrorResponse("Listing not found", 404);
    }

    if (listing.userId !== currentUser.id) {
      return createErrorResponse("You don't have permission to update this listing", 403);
    }

    const body = await request.json().catch(() => ({}));

    if (!body || typeof body !== "object" || Object.keys(body).length === 0) {
      return createErrorResponse("Request body is required and must not be empty", 400);
    }

    const { packages, ...listingData } = body;

    // Ensure fields that expect String but might receive Number are converted
    const stringFields = ['carpetArea', 'minimumBookingHours', 'maximumPax'];
    for (const field of stringFields) {
      if (listingData[field] !== undefined && listingData[field] !== null) {
        listingData[field] = String(listingData[field]);
      }
    }

    if (Object.keys(listingData).length > 0) {
      await prisma.listing.update({
        where: { id: listingId },
        data: listingData,
      });
    }

    if (Array.isArray(packages)) {
      if (packages.length > 20) {
        return createErrorResponse("Maximum 20 packages allowed per listing", 400);
      }

      const existing = await prisma.package.findMany({
        where: { listingId },
        select: { id: true },
      });
      const existingIds = new Set(existing.map(p => p.id));
      const incomingIds = new Set(
        packages
          .filter((p: PackageInput) => p.id && typeof p.id === "string")
          .map((p: PackageInput) => String(p.id))
      );

      const toDelete = [...existingIds].filter(id => !incomingIds.has(id));
      if (toDelete.length > 0) {
        await prisma.package.deleteMany({ where: { id: { in: toDelete } } });
      }

      for (const p of packages) {
        if (!p.title || typeof p.title !== "string") {
          return createErrorResponse("Package title is required and must be a string", 400);
        }

        const title = String(p.title).trim();
        if (title.length < 3 || title.length > 200) {
          return createErrorResponse("Package title must be between 3 and 200 characters", 400);
        }

        if (typeof p.offeredPrice !== "number" || !Number.isFinite(p.offeredPrice) || p.offeredPrice < 0) {
          return createErrorResponse("Package offeredPrice must be a non-negative number", 400);
        }

        if (p.offeredPrice > 10000000) {
          return createErrorResponse("Package offeredPrice exceeds maximum limit", 400);
        }

        const originalPrice = typeof p.originalPrice === "number" && Number.isFinite(p.originalPrice) && p.originalPrice >= 0
          ? p.originalPrice
          : 0;

        if (originalPrice > 0 && p.offeredPrice > originalPrice) {
          return createErrorResponse("offeredPrice cannot be greater than originalPrice", 400);
        }

        if (typeof p.durationHours !== "number" || !Number.isFinite(p.durationHours) || p.durationHours <= 0) {
          return createErrorResponse("Package durationHours must be a positive number", 400);
        }

        if (p.durationHours > 168) {
          return createErrorResponse("Package durationHours cannot exceed 168 hours (7 days)", 400);
        }

        const features = Array.isArray(p.features)
          ? p.features
            .filter((f: unknown) => typeof f === "string")
            .map((f: string) => f.trim())
            .filter((f: string) => f.length > 0 && f.length <= 200)
            .slice(0, 20)
          : [];

        const data = {
          title,
          originalPrice: Math.round(originalPrice),
          offeredPrice: Math.round(p.offeredPrice),
          features,
          durationHours: Math.round(p.durationHours),
          listingId,
        };

        if (p.id && typeof p.id === "string" && existingIds.has(p.id)) {
          await prisma.package.update({ where: { id: p.id }, data });
        } else {
          await prisma.package.create({ data });
        }
      }
    }

    const out = await prisma.listing.findUnique({
      where: { id: listingId },
      include: { packages: true },
    });
    return createSuccessResponse(out);
  } catch (error) {
    return handleRouteError(error, "PATCH /api/listings/[listingId]");
  }
}
