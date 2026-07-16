import { Invoice } from "@prisma/client";

import { AttachmentInput } from "@/lib/email/mailer";
import { InvoiceService } from "@/lib/invoice/service";
import prisma from "@/lib/prismadb";

type CreateInvoiceParams = {
  userId: string;
  reservationId: string;
  transactionId: string;
};

export type InvoiceWithAttachment = {
  invoice: Invoice;
  attachment?: AttachmentInput;
};

const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

function normalizeObjectId(value: string, fieldName: string) {
  const normalized = value.trim();
  if (!OBJECT_ID_PATTERN.test(normalized)) {
    throw new Error(`${fieldName} must be a valid id`);
  }
  return normalized;
}

export async function ensureInvoiceWithAttachment(
  params: CreateInvoiceParams
): Promise<InvoiceWithAttachment> {
  const userId = normalizeObjectId(params.userId, "userId");
  const reservationId = normalizeObjectId(params.reservationId, "reservationId");
  const transactionId = normalizeObjectId(params.transactionId, "transactionId");

  const txn = await prisma.transaction.findUnique({
    where: { id: transactionId },
    select: { userId: true, reservationId: true },
  });

  if (!txn) throw new Error("Transaction not found");
  if (txn.userId !== userId || txn.reservationId !== reservationId) {
    throw new Error("Transaction does not match the provided user/reservation pair");
  }

  return await InvoiceService.ensureCustomerInvoiceForTransaction(transactionId);
}
