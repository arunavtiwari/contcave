import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/lib/prismadb";

interface IParams {
  listingId?: string;
}

export async function PATCH(request: Request, props: { params: Promise<IParams> }) {
  const params = await props.params;
  const currentUser = await getCurrentUser();

  if (!currentUser) return NextResponse.error();

  const { listingId } = params;
  if (!listingId || typeof listingId !== "string") throw new Error("Invalid Id");

  const body = await request.json();
  delete body.id;
  delete body.user;
  delete body.createdAt;

  if (!body || Object.keys(body).length === 0) throw new Error("Invalid request body");

  const { packages, ...listingData } = body;

  // Get existing package IDs for this listing
  const existingPackages = await prisma.package.findMany({
    where: { listingId },
    select: { id: true },
  });
  const existingPackageIds = existingPackages.map((p) => p.id);

  // Split incoming packages into:
  // - update: packages with id that exist
  // - create: packages without id
  // - delete: packages that exist but are missing in incoming data
  const updatePackages = (packages || []).filter((p: any) => p.id && existingPackageIds.includes(p.id));
  const createPackages = (packages || []).filter((p: any) => !p.id);
  const incomingIds = (packages || []).filter((p: any) => p.id).map((p: any) => p.id);
  const deletePackagesIds = existingPackageIds.filter((id) => !incomingIds.includes(id));

  const listing = await prisma.listing.update({
    where: { id: listingId },
    data: {
      ...listingData,
      packages: {
        // Delete removed packages
        deleteMany: deletePackagesIds.length > 0 ? { id: { in: deletePackagesIds } } : undefined,
        // Update existing packages
        update: updatePackages.map((pkg: any) => ({
          where: { id: pkg.id },
          data: {
            title: pkg.title,
            description: pkg.description || "",
            originalPrice: parseInt(pkg.originalPrice, 10),
            offeredPrice: parseInt(pkg.offeredPrice, 10),
            features: pkg.features || [],
          },
        })),
        // Create new packages
        create: createPackages.map((pkg: any) => ({
          title: pkg.title,
          description: pkg.description || "",
          originalPrice: parseInt(pkg.originalPrice, 10),
          offeredPrice: parseInt(pkg.offeredPrice, 10),
          features: pkg.features || [],
        })),
      },
    },
    include: { packages: true },
  });

  return NextResponse.json(listing);
}
