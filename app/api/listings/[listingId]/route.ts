import { NextResponse } from "next/server";
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
    const { listingId } = await props.params;
    const currentUser = await getCurrentUser();
    if (!currentUser) return createErrorResponse("Authentication required", 401);
    if (!listingId || typeof listingId !== "string") return createErrorResponse("Invalid Id", 400);

    const body = await request.json();
    if (!body || Object.keys(body).length === 0) return createErrorResponse("Invalid request body", 400);

    const { packages, ...listingData } = body;

    await prisma.listing.update({
      where: { id: listingId },
      data: listingData,
    });

    if (Array.isArray(packages)) {
      const existing = await prisma.package.findMany({
        where: { listingId },
        select: { id: true },
      });
      const existingIds = new Set(existing.map(p => p.id));
      const incomingIds = new Set(packages.filter((p: PackageInput) => p.id).map((p: PackageInput) => p.id));

      const toDelete = [...existingIds].filter(id => !incomingIds.has(id));
      if (toDelete.length) {
        await prisma.package.deleteMany({ where: { id: { in: toDelete } } });
      }

      for (const p of packages) {
        const data = {
          title: String(p.title),
          originalPrice: Number(p.originalPrice ?? 0),
          offeredPrice: Number(p.offeredPrice),
          features: Array.isArray(p.features) ? p.features.map(String) : [],
          durationHours: Number(p.durationHours),
          listingId,
        };

        if (p.id && existingIds.has(p.id)) {
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
