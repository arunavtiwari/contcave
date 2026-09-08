"use server";

import { z } from "zod";

import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/lib/prismadb";

interface IParams {
  tid: string;
}

const transactionReferenceSchema = z.string().trim().min(1).max(200);

export default async function getReservation(params: IParams) {
  const parsed = transactionReferenceSchema.safeParse(params?.tid);
  if (!parsed.success) return null;
  const tid = parsed.data;

  try {
    const currentUser = await getCurrentUser();
    if (!currentUser?.id) return null;

    const reservation = await prisma.reservation.findFirst({
      where: {
        userId: currentUser.id,
        Transaction: {
          some: {
            userId: currentUser.id,
            OR: [
              { cfOrderId: tid },
              { cfTxnRef: tid },
            ],
          },
        },
        markedForDeletion: false,
        AND: [{
          OR: [{ hiddenByGuestAt: null }, { hiddenByGuestAt: { isSet: false } }],
        }],
      },
      include: {
        listing: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!reservation) return null;

    return {
      ...reservation,
      createdAt: reservation.createdAt.toISOString(),
      startDate: reservation.startDate.toISOString(),
      startTime: reservation.startTime,
      endTime: reservation.endTime,
      markedForDeletionAt: reservation.markedForDeletionAt?.toISOString() || null,
      listing: reservation.listing
        ? {
          ...reservation.listing,
          createdAt: reservation.listing.createdAt.toISOString(),
        }
        : null,
    };
  } catch (error: unknown) {
    throw new Error(error instanceof Error ? error.message : "Failed to fetch reservation");
  }
}
