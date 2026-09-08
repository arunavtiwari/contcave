"use server";

import { z } from "zod";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { PostBookingService } from "@/lib/post-booking/service";
import prisma from "@/lib/prismadb";
import { ReservationService } from "@/lib/reservation/service";

const transactionReferenceSchema = z.string().trim().min(1).max(200);

const clientTransactionSelect = {
  id: true,
  status: true,
  purpose: true,
  amount: true,
  reservationId: true,
  listingId: true,
  reservation: {
    select: {
      id: true,
      bookingId: true,
      startDate: true,
      startTime: true,
      endTime: true,
      totalPrice: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      markedForDeletionAt: true,
      listingId: true,
      listing: {
        select: {
          id: true,
          title: true,
          locationValue: true,
        },
      },
    },
  },
  extensionRequest: {
    select: {
      status: true,
      durationMinutes: true,
      requestedEndTime: true,
    },
  },
  additionalCharge: {
    select: {
      status: true,
      type: true,
      totalAmount: true,
    },
  },
  listing: {
    select: {
      id: true,
      title: true,
      locationValue: true,
    },
  },
} as const;

async function findClientTransaction(transactionId: string, userId: string) {
  const transaction = await prisma.transaction.findFirst({
    where: { id: transactionId, userId },
    select: clientTransactionSelect,
  });
  if (!transaction) return null;

  return {
    ...transaction,
    reservation: transaction.reservation
      ? {
          ...transaction.reservation,
          startDate: transaction.reservation.startDate.toISOString(),
          createdAt: transaction.reservation.createdAt.toISOString(),
          updatedAt: transaction.reservation.updatedAt.toISOString(),
          markedForDeletionAt: transaction.reservation.markedForDeletionAt?.toISOString() || null,
        }
      : null,
  };
}

export default async function getTransaction({ tid }: { tid: string }) {
  const parsed = transactionReferenceSchema.safeParse(tid);
  if (!parsed.success) return null;

  const currentUser = await getCurrentUser();
  if (!currentUser?.id) return null;

  const txn = await prisma.transaction.findFirst({
    where: {
      userId: currentUser.id,
      OR: [{ cfTxnRef: parsed.data }, { cfOrderId: parsed.data }],
    },
    select: {
      id: true,
      status: true,
      purpose: true,
      cfOrderId: true,
      cfPaymentId: true,
      reservationId: true,
      listingId: true,
    },
  });

  if (!txn) return null;

  if (txn.status === "PENDING" && txn.cfOrderId) {
    await ReservationService.reconcileTransaction(txn.id);
  } else if (txn.status === "SUCCESS" && txn.purpose === "EXTENSION") {
    await PostBookingService.applyExtensionPayment(txn.id, txn.cfPaymentId || undefined);
  } else if (txn.status === "SUCCESS" && txn.purpose === "ADDITIONAL_CHARGE") {
    await PostBookingService.applyAdditionalChargePayment(txn.id, txn.cfPaymentId || undefined);
  } else if (txn.status === "SUCCESS" && txn.purpose === "BASE_BOOKING" && !txn.reservationId && txn.listingId) {
    await ReservationService.createFromTransaction(txn.id);
  } else if (txn.status === "SUCCESS" && txn.reservationId) {
    await ReservationService.ensurePostReservationSideEffects(txn.id);
  }

  return await findClientTransaction(txn.id, currentUser.id);
}
