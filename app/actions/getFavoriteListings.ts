"use server";



import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/lib/prismadb";

export default async function getFavoriteListings() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return [];
    }

    const favorites = await prisma.listing.findMany({
      where: {
        id: {
          in: [...(currentUser.favoriteIds || [])],
        },
      },
    });

    const safeFavorites = favorites.map((favorite) => {
      let actualLocation = favorite.actualLocation as Record<string, unknown> | undefined;
      
      if (actualLocation) {
        // Create a deep copy to avoid mutating Prisma result directly
        actualLocation = JSON.parse(JSON.stringify(actualLocation));
        if (actualLocation) {
          actualLocation.isExact = false;
          delete actualLocation.exactLatlng;
        }
      }

      return {
        ...favorite,
        actualLocation,
        createdAt: favorite.createdAt.toString(),
      };
    });

    return safeFavorites;
  } catch (error: unknown) {
    throw new Error(error instanceof Error ? error.message : "An unknown error occurred");
  }
}
