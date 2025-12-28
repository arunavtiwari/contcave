"use server";

import prisma from "@/lib/prismadb";

interface IParams {
  listingId?: string;
  userId?: string;
  authorId?: string;
}

export default async function getReservations(params: IParams) {
  try {
    const { listingId, userId, authorId } = params;

    const query: {
      markedForDeletion: boolean;
      listingId?: string;
      userId?: string;
      listing?: { userId: string };
    } = {
      markedForDeletion: false,
    };

    if (listingId) {
      query.listingId = listingId;
    }

    if (userId) {
      query.userId = userId;
    }

    if (authorId) {
      query.listing = { userId: authorId };
    }

    const reservation = await prisma.reservation.findMany({
      where: query,
      include: {
        listing: true,
        Review: false
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const safeReservations = reservation.map((reservation) => ({
      ...reservation,
      createdAt: reservation.createdAt.toISOString(),
      startDate: reservation.startDate,
      startTime: reservation.startTime,
      endTime: reservation.endTime,
      markedForDeletionAt: reservation.markedForDeletionAt?.toISOString() || null,
      listing: {
        ...reservation.listing,
        createdAt: reservation.listing.createdAt.toISOString(),
      },
    }));

    return safeReservations;
  } catch (error: unknown) {
    throw new Error(error instanceof Error ? error.message : "An unknown error occurred");
  }
}
