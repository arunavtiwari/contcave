"use server";

import { InvoiceDocumentType, InvoiceStatus, TransactionStatus } from "@prisma/client";
import { z } from "zod";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { createAction } from "@/lib/actions-utils";
import { InvoiceService } from "@/lib/invoice/service";
import prisma from "@/lib/prismadb";
import { isAdmin } from "@/lib/user/permissions";
import { UserRole } from "@/types/user";

type AdminGstModel = "GST_STUDIO_AGENT" | "NON_GST_PRINCIPAL" | "UNKNOWN";

export type AdminBookingDetail = {
  startTime: string;
  endTime: string;
  createdAt: string;
  rejectReason?: string | null;
  billingCompany?: string | null;
  billingGstin?: string | null;
  billingAddress?: string | null;
  selectedAddons: unknown;
  pricingSnapshot: unknown;
  selectedSetIds: string[];
  selectedSets: Array<{
    id: string;
    name: string;
    price: number;
    description?: string | null;
  }>;
  selectedPackage?: {
    id: string;
    title: string;
    offeredPrice: number;
    durationHours: number;
    description?: string | null;
    features: string[];
  } | null;
  listing: {
    id: string;
    locationValue: string;
    propertyStateCode?: string | null;
    hasSets: boolean;
  };
  transaction?: {
    id: string;
    cfTxnRef?: string | null;
    paymentMethod?: string | null;
    createdAt: string;
    payoutAmountToOwner?: number | null;
    payoutSplitAt?: string | null;
    payoutDoneAt?: string | null;
  } | null;
};

export type AdminBookingRow = {
  id: string;
  bookingId: string;
  customerName: string;
  ownerName: string;
  studioName: string;
  amount: number;
  startDate: string;
  approvalStatus: number | null;
  paymentStatus: TransactionStatus | "NO_PAYMENT";
  gstModel: AdminGstModel;
  gstOwner?: string | null;
  customerInvoiceNumber?: string | null;
  customerInvoiceStatus?: InvoiceStatus | null;
  customerInvoiceUrl?: string | null;
  customerInvoiceEmailSentAt?: string | null;
  detail: AdminBookingDetail;
};

export type AdminInvoiceRow = {
  id: string;
  invoiceNumber: string;
  documentType: InvoiceDocumentType;
  status: InvoiceStatus;
  recipientName: string;
  bookingId?: string | null;
  amount: number;
  totalAmount: number;
  issuedAt?: string | null;
  emailSentAt?: string | null;
  emailError?: string | null;
  retryCount: number;
  invoiceUrl: string;
  reservationMarkedForDeletion?: boolean | null;
};

export type AdminPayoutRow = {
  id: string;
  bookingId?: string | null;
  ownerName: string;
  studioName: string;
  vendorId?: string | null;
  amount: number;
  payoutAmount?: number | null;
  payoutSplitAt?: string | null;
  payoutDoneAt?: string | null;
  status: TransactionStatus;
};

export type AdminAuditRow = {
  id: string;
  action: string;
  resourceId?: string | null;
  createdAt: string;
  metadata?: unknown;
};

function iso(value?: Date | null) {
  return value ? value.toISOString() : null;
}

export async function getAdminBookingOperations() {
  const currentUser = await getCurrentUser();
  if (!currentUser || !isAdmin(currentUser.role)) {
    throw new Error("Unauthorized");
  }

  const [reservations, invoices, payouts, audits] = await Promise.all([
    prisma.reservation.findMany({
      where: { markedForDeletion: false },
      select: {
        id: true,
        bookingId: true,
        totalPrice: true,
        startDate: true,
        startTime: true,
        endTime: true,
        createdAt: true,
        isApproved: true,
        rejectReason: true,
        selectedAddons: true,
        pricingSnapshot: true,
        setIds: true,
        setPackageId: true,
        billingDetail: {
          select: {
            companyName: true,
            gstin: true,
            billingAddress: true,
          },
        },
        user: { select: { name: true, email: true } },
        listing: {
          select: {
            id: true,
            title: true,
            locationValue: true,
            propertyStateCode: true,
            hasSets: true,
            user: { select: { name: true, email: true } },
            sets: {
              select: {
                id: true,
                name: true,
                price: true,
                description: true,
              },
              orderBy: [{ position: "asc" }, { price: "asc" }],
            },
            packages: {
              select: {
                id: true,
                title: true,
                description: true,
                offeredPrice: true,
                durationHours: true,
                features: true,
              },
            },
          },
        },
        Transaction: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            status: true,
            gstOwnedBy: true,
            cfTxnRef: true,
            paymentMethod: true,
            createdAt: true,
            payoutAmountToOwner: true,
            payoutSplitAt: true,
            payoutDoneAt: true,
          },
        },
        invoices: {
          where: {
            documentType: {
              in: ["CUSTOMER_STUDIO_TAX_INVOICE", "CUSTOMER_ARKANET_TAX_INVOICE"],
            },
          },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            invoiceNumber: true,
            status: true,
            invoiceUrl: true,
            emailSentAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.invoice.findMany({
      select: {
        id: true,
        invoiceNumber: true,
        documentType: true,
        status: true,
        amount: true,
        totalAmount: true,
        issuedAt: true,
        emailSentAt: true,
        emailError: true,
        retryCount: true,
        invoiceUrl: true,
        user: { select: { name: true, email: true } },
        reservation: { select: { bookingId: true, markedForDeletion: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.transaction.findMany({
      where: {
        OR: [
          { payoutAmountToOwner: { not: null } },
          { payoutSplitAt: { not: null } },
          { payoutDoneAt: { not: null } },
        ],
      },
      select: {
        id: true,
        bookingId: true,
        vendorId: true,
        amount: true,
        payoutAmountToOwner: true,
        payoutSplitAt: true,
        payoutDoneAt: true,
        status: true,
        reservation: {
          select: {
            bookingId: true,
            listing: {
              select: {
                title: true,
                user: { select: { name: true, email: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.auditLog.findMany({
      where: { resource: "Invoice" },
      select: {
        id: true,
        action: true,
        resourceId: true,
        createdAt: true,
        metadata: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  const bookingRows: AdminBookingRow[] = reservations.map((reservation) => {
    const transaction = reservation.Transaction[0];
    const customerInvoice = reservation.invoices[0];
    const gstModel: AdminGstModel =
      transaction?.gstOwnedBy === "STUDIO"
        ? "GST_STUDIO_AGENT"
        : transaction?.gstOwnedBy === "ARKANET"
          ? "NON_GST_PRINCIPAL"
          : "UNKNOWN";

    return {
      id: reservation.id,
      bookingId: reservation.bookingId,
      customerName: reservation.user.name || reservation.user.email || "Customer",
      ownerName: reservation.listing.user.name || reservation.listing.user.email || "Owner",
      studioName: reservation.listing.title,
      amount: reservation.totalPrice,
      startDate: reservation.startDate.toISOString(),
      approvalStatus: reservation.isApproved,
      paymentStatus: transaction?.status || "NO_PAYMENT",
      gstModel,
      gstOwner: transaction?.gstOwnedBy,
      customerInvoiceNumber: customerInvoice?.invoiceNumber,
      customerInvoiceStatus: customerInvoice?.status,
      customerInvoiceUrl: customerInvoice?.invoiceUrl,
      customerInvoiceEmailSentAt: iso(customerInvoice?.emailSentAt),
      detail: {
        startTime: reservation.startTime,
        endTime: reservation.endTime,
        createdAt: reservation.createdAt.toISOString(),
        rejectReason: reservation.rejectReason,
        billingCompany: reservation.billingDetail?.companyName,
        billingGstin: reservation.billingDetail?.gstin,
        billingAddress: reservation.billingDetail?.billingAddress,
        selectedAddons: reservation.selectedAddons,
        pricingSnapshot: reservation.pricingSnapshot,
        selectedSetIds: reservation.setIds,
        selectedSets: reservation.listing.sets
          .filter((set) => reservation.setIds.includes(set.id))
          .map((set) => ({
            id: set.id,
            name: set.name,
            price: set.price,
            description: set.description,
          })),
        selectedPackage: reservation.setPackageId
          ? reservation.listing.packages.find((pkg) => pkg.id === reservation.setPackageId) || null
          : null,
        listing: {
          id: reservation.listing.id,
          locationValue: reservation.listing.locationValue,
          propertyStateCode: reservation.listing.propertyStateCode,
          hasSets: reservation.listing.hasSets,
        },
        transaction: transaction
          ? {
            id: transaction.id,
            cfTxnRef: transaction.cfTxnRef,
            paymentMethod: transaction.paymentMethod,
            createdAt: transaction.createdAt.toISOString(),
            payoutAmountToOwner: transaction.payoutAmountToOwner,
            payoutSplitAt: iso(transaction.payoutSplitAt),
            payoutDoneAt: iso(transaction.payoutDoneAt),
          }
          : null,
      },
    };
  });

  const invoiceRows: AdminInvoiceRow[] = invoices.map((invoice) => ({
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    documentType: invoice.documentType,
    status: invoice.status,
    recipientName: invoice.user.name || invoice.user.email || "Recipient",
    bookingId: invoice.reservation?.bookingId,
    reservationMarkedForDeletion: invoice.reservation?.markedForDeletion,
    amount: invoice.amount,
    totalAmount: invoice.totalAmount,
    issuedAt: iso(invoice.issuedAt),
    emailSentAt: iso(invoice.emailSentAt),
    emailError: invoice.emailError,
    retryCount: invoice.retryCount,
    invoiceUrl: invoice.invoiceUrl,
  }));

  const payoutRows: AdminPayoutRow[] = payouts.map((txn) => ({
    id: txn.id,
    bookingId: txn.bookingId || txn.reservation?.bookingId,
    ownerName: txn.reservation?.listing.user.name || txn.reservation?.listing.user.email || "Owner",
    studioName: txn.reservation?.listing.title || "Studio",
    vendorId: txn.vendorId,
    amount: txn.amount,
    payoutAmount: txn.payoutAmountToOwner,
    payoutSplitAt: iso(txn.payoutSplitAt),
    payoutDoneAt: iso(txn.payoutDoneAt),
    status: txn.status,
  }));

  const auditRows: AdminAuditRow[] = audits.map((audit) => ({
    id: audit.id,
    action: audit.action,
    resourceId: audit.resourceId,
    createdAt: audit.createdAt.toISOString(),
    metadata: audit.metadata,
  }));

  const activeBookingCustomerInvoices = invoiceRows.filter((invoice) =>
    invoice.documentType.startsWith("CUSTOMER_")
    && Boolean(invoice.bookingId)
    && invoice.reservationMarkedForDeletion !== true
  );
  const ownerInvoiceRows = invoiceRows.filter((invoice) => invoice.documentType.startsWith("OWNER_"));
  const visibleFailureRows = invoiceRows.filter((invoice) => {
    const failed = ["EMAIL_FAILED", "DELIVERY_BLOCKED", "RETRYING"].includes(invoice.status) || Boolean(invoice.emailError);
    if (!failed) return false;
    if (invoice.documentType.startsWith("OWNER_")) return true;
    return Boolean(invoice.bookingId) && invoice.reservationMarkedForDeletion !== true;
  });

  return {
    bookings: bookingRows,
    customerInvoices: activeBookingCustomerInvoices,
    ownerInvoices: ownerInvoiceRows,
    failures: visibleFailureRows,
    payouts: payoutRows,
    audits: auditRows,
  };
}

export const retryAdminInvoiceEmailAction = createAction(
  z.object({ invoiceId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid invoice ID") }),
  { requireAuth: true, allowedRoles: [UserRole.ADMIN] },
  async ({ invoiceId }) => {
    const invoice = await InvoiceService.retryFailedInvoiceEmail(invoiceId);
    return { invoiceId: invoice.id, status: invoice.status };
  }
);
