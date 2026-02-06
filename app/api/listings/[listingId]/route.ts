import getCurrentUser from "@/app/actions/getCurrentUser";
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";
import prisma from "@/lib/prismadb";

export const runtime = "nodejs";

interface IParams { listingId?: string }

type PackageInput = {
  id?: string;
  title: unknown;
  originalPrice?: unknown;
  offeredPrice: unknown;
  features?: unknown;
  durationHours: unknown;
  requiredSetCount?: unknown;
};

type SetInput = {
  id?: string;
  name: unknown;
  description?: unknown;
  images?: unknown;
  price?: unknown;
  position?: unknown;
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

    const { packages, sets, blocks, ...listingData } = body;

    const stringFields = ['carpetArea', 'minimumBookingHours', 'maximumPax'];
    for (const field of stringFields) {
      if (listingData[field] !== undefined && listingData[field] !== null) {
        listingData[field] = String(listingData[field]);
      }
    }

    const validPricingTypes = ["FIXED", "HOURLY"];
    if (listingData.additionalSetPricingType !== undefined) {
      if (!validPricingTypes.includes(listingData.additionalSetPricingType)) {
        listingData.additionalSetPricingType = null;
      }
    }

    if (listingData.unifiedSetPrice !== undefined) {
      listingData.unifiedSetPrice = listingData.unifiedSetPrice !== null ? Math.round(Number(listingData.unifiedSetPrice)) : null;
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

      const toDelete = [...existingIds].filter((id: string) => !incomingIds.has(id));
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
          requiredSetCount: p.requiredSetCount ? Math.max(1, Number(p.requiredSetCount) || 1) : null,
          listingId,
        };

        if (p.id && typeof p.id === "string" && existingIds.has(p.id)) {
          await prisma.package.update({ where: { id: p.id }, data });
        } else {
          await prisma.package.create({ data });
        }
      }
    }

    if (Array.isArray(sets)) {
      if (sets.length > 50) {
        return createErrorResponse("Maximum 50 sets allowed per listing", 400);
      }

      const existingSets = await prisma.listingSet.findMany({
        where: { listingId },
        select: { id: true },
      });
      const existingSetIds = new Set(existingSets.map((s) => s.id));
      const incomingSetIds = new Set(
        sets
          .filter((s: SetInput) => s.id && typeof s.id === "string")
          .map((s: SetInput) => String(s.id))
      );

      const setsToDelete = [...existingSetIds].filter((id: string) => !incomingSetIds.has(id));
      if (setsToDelete.length > 0) {

        const futureReservations = await prisma.reservation.findFirst({
          where: {
            listingId,
            setIds: { hasSome: setsToDelete },
            startDate: { gte: new Date() },
            markedForDeletion: false,
          }
        });

        if (futureReservations) {
          return createErrorResponse("Cannot delete sets that have future reservations", 400);
        }

        await prisma.listingSet.deleteMany({ where: { id: { in: setsToDelete } } });

        const affectedPackages = await prisma.package.findMany({
          where: { listingId, eligibleSetIds: { hasSome: setsToDelete } }
        });

        for (const pkg of affectedPackages) {
          const newEligibleIds = pkg.eligibleSetIds.filter((id: string) => !setsToDelete.includes(id));
          await prisma.package.update({
            where: { id: pkg.id },
            data: { eligibleSetIds: newEligibleIds }
          });
        }
      }

      for (let i = 0; i < sets.length; i++) {
        const s = sets[i] as SetInput;

        if (!s.name || typeof s.name !== "string") {
          return createErrorResponse(`Set ${i + 1}: name is required and must be a string`, 400);
        }

        const setName = String(s.name).trim();
        if (setName.length < 1 || setName.length > 200) {
          return createErrorResponse(`Set ${i + 1}: name must be between 1 and 200 characters`, 400);
        }

        const setPrice = typeof s.price === "number" && Number.isFinite(s.price) && s.price >= 0
          ? Math.round(s.price)
          : 0;

        if (setPrice > 10000000) {
          return createErrorResponse(`Set ${i + 1}: price exceeds maximum limit`, 400);
        }

        const setImages = Array.isArray(s.images)
          ? s.images
            .filter((img: unknown) => typeof img === "string" && (img as string).trim().length > 0)
            .slice(0, 20)
          : [];

        const setData = {
          name: setName,
          description: typeof s.description === "string" ? s.description.trim().slice(0, 2000) : null,
          images: setImages,
          price: setPrice,
          position: typeof s.position === "number" ? Math.round(s.position) : i,
          listingId,
        };

        if (s.id && typeof s.id === "string" && existingSetIds.has(s.id)) {
          await prisma.listingSet.update({ where: { id: s.id }, data: setData });
        } else {
          await prisma.listingSet.create({ data: setData });
        }
      }
    }



    const out = await prisma.listing.findUnique({
      where: { id: listingId },
      include: {
        packages: true,
        sets: { orderBy: { position: "asc" } },
      },
    });
    return createSuccessResponse(out);
  } catch (error) {
    return handleRouteError(error, "PATCH /api/listings/[listingId]");
  }
}

