"use server";

import prisma from "@/lib/prismadb";

export interface IListingsParams {
  userId?: string;
  startDate?: string;
  endDate?: string;
  locationValue?: string;
  category?: string;
  type?: string;
  hasSets?: string;
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
      hasSets,
    } = params;

    const query: {
      userId?: string;
      active?: boolean;
      category?: string;
      locationValue?: string;
      type?: { has: string };
      hasSets?: boolean;
      NOT?: {
        reservations: {
          some: {
            AND: [
              { markedForDeletion: boolean },
              {
                OR: [
                  { endDate: { gte: string }; startDate: { lte: string } },
                  { startDate: { lte: string }; endDate: { gte: string } }
                ]
              }
            ]
          }
        }
      };
    } = {};

    if (userId) {
      query.userId = userId;
    } else {

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
    if (hasSets === "true") {
      query.hasSets = true;
    }



    if (startDate && endDate) {
      query.NOT = {
        reservations: {
          some: {
            AND: [
              {
                markedForDeletion: false,
              },
              {
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
  } catch (error: unknown) {
    throw new Error(error instanceof Error ? error.message : "An unknown error occurred");
  }
}
