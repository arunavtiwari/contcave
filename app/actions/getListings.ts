import prisma from "@/lib/prismadb";

export interface IListingsParams {
  userId?: string;
  startDate?: string;
  endDate?: string;
  locationValue?: string;
  category?: string;
  type?: string;
}

export default async function getListings(params: IListingsParams) {
  try {
    const {
      userId,
      locationValue,
      startDate,
      endDate,
      category,
      type,
    } = params;

    let query: any = {};

    if (userId) {
      query.userId = userId;
    } else {
      // Only show active listings on public listings page
      query.active = true;
    }

    if (category) {
      query.category = category;
    }

    if (locationValue) {
      query.locationValue = locationValue;
    }
    if (type) {
      query.type = { has: type };
    }



    if (startDate && endDate) {
      query.NOT = {
        reservations: {
          some: {
            OR: [
              {
                endDate: { gte: startDate },
                startDate: { lte: startDate },
              },
              {
                startDate: { lte: endDate },
                endDate: { gte: endDate },
              },
            ],
          },
        },
      };
    }

    const listing = await prisma.listing.findMany({
      where: query,
      orderBy: {
        createdAt: "desc",
      },
    });

    const safeListings = listing.map((list) => ({
      ...list,
      createdAt: list.createdAt.toISOString(),
    }));

    return safeListings;
  } catch (error: any) {
    throw new Error(error.message);
  }
}
