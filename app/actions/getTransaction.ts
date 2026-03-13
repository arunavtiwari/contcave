"use server";

import { cfFetchOrder, cfMapStatus } from "@/lib/cashfree/cashfree";
import prisma from "@/lib/prismadb";

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

  // Active Reconciliation: If pending, fetch status from Cashfree
  if (txn.status === "PENDING" && txn.cfOrderId) {
    try {
      const order = await cfFetchOrder(txn.cfOrderId);
      if (order?.order_status) {
        const newStatus = cfMapStatus(order.order_status);
        if (newStatus !== "PENDING") {
          // Status changed, update DB
          const updated = await prisma.transaction.update({
            where: { id: txn.id },
            data: { status: newStatus },
            include: {
              reservation: { include: { listing: true } },
              listing: true,
              user: true,
            },
          });
          return updated;
        }
      }
    } catch (error) {
      console.error("Active reconciliation failed", error);
    }
  }

  return txn;
}
