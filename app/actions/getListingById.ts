"use server";

import prisma from "@/lib/prismadb";

interface IParams {
  listingId?: string;
}

export default async function getListingById(params: IParams) {
  try {
    const { listingId } = params;

    const listing = await prisma.listing.findUnique({
      where: {
        id: listingId,
      },
      include: {
        user: true,
        packages: true
      },
    });

    if (!listing) {
      return null;
    }

    return {
      ...listing,
      createdAt: listing.createdAt.toString(),
      user: {
        ...listing.user,
        createdAt: listing.user.createdAt.toString(),
        updatedAt: listing.user.updatedAt.toString(),
        emailVerified: listing.user.emailVerified?.toString() || null,
        verified_at: listing.user.verified_at
          ? listing.user.verified_at.toISOString()
          : null,
        markedForDeletionAt: listing.user.markedForDeletionAt
          ? listing.user.markedForDeletionAt.toISOString()
          : null,
      },
    };
  } catch (error: any) {
    throw new Error(error.message);
  }
}
