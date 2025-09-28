import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/lib/prismadb";

export const runtime = "nodejs";

interface IParams { listingId?: string }

export async function PATCH(request: Request, props: { params: Promise<IParams> }) {
  const { listingId } = await props.params;
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.error();
  if (!listingId || typeof listingId !== "string") throw new Error("Invalid Id");

  const body = await request.json();
  if (!body || Object.keys(body).length === 0) throw new Error("Invalid request body");

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
    const incomingIds = new Set(packages.filter((p: any) => p.id).map((p: any) => p.id));

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
  return NextResponse.json(out);
}
