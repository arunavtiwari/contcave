"use server";

import prisma from "@/lib/prismadb";
import { ReservationService } from "@/lib/reservation/service";

type Args = { tid: string };


export default async function getTransaction({ tid }: Args) {
  if (!tid) return null;
  const txn = await prisma.transaction.findFirst({
    where: { cfTxnRef: tid },
    include: {
      reservation: { include: { listing: true } },
      listing: true,
      user: true,
    },
  });

  if (!txn) return null;

  if (txn.status === "PENDING" && txn.cfOrderId) {
    return await ReservationService.reconcileTransaction(txn.id);
  }

  if (txn.status === "SUCCESS" && !txn.reservationId && txn.listingId) {
    await ReservationService.createFromTransaction(txn.id);
    return await prisma.transaction.findUnique({
      where: { id: txn.id },
      include: {
        reservation: { include: { listing: true } },
        listing: true,
        user: true,
      },
    });
  }

  return txn;
}
