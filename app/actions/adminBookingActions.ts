"use server";

import { InvoiceDocumentType, InvoiceStatus, PaymentVoucherStatus, PaymentVoucherType, Prisma, ReservationStatus, TransactionStatus } from "@prisma/client";
import { z } from "zod";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { createAction } from "@/lib/actions-utils";
import { InvoiceService } from "@/lib/invoice/service";
import { PaymentVoucherService } from "@/lib/payment-voucher/service";
import prisma from "@/lib/prismadb";
import { parseReservationEndTimeForDate } from "@/lib/reservation/time";
import { isAdmin } from "@/lib/user/permissions";
import { UserRole } from "@/types/user";

type AdminGstModel = "GST_STUDIO_AGENT" | "NON_GST_PRINCIPAL" | "UNKNOWN";
export type AdminBookingTab = "bookings" | "ownerInvoices" | "vouchers" | "payouts" | "failures" | "audit";

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
  postBookingPayments: Array<{
    id: string;
    kind: "EXTENSION" | "SERVICE" | "DAMAGE";
    status: string;
    amount: number;
    detail?: string | null;
  }>;
};

export type AdminBookingRow = {
  id: string;
  bookingId: string;
  customerName: string;
  ownerName: string;
  studioName: string;
  amount: number;
  startDate: string;
  lifecycleStatus: ReservationStatus;
  checkedInAt?: string | null;
  completedAt?: string | null;
  noShowAt?: string | null;
  refundAmount?: number | null;
  refundRecordedAt?: string | null;
  unverifiedPast: boolean;
  reviewRequiredPaymentCount: number;
  pendingPostBookingPaymentCount: number;
  paymentStatus: TransactionStatus | "NO_PAYMENT";
  gstModel: AdminGstModel;
  gstOwner?: string | null;
  customerInvoiceNumber?: string | null;
  customerInvoiceId?: string | null;
  customerInvoiceStatus?: InvoiceStatus | null;
  customerInvoiceUrl?: string | null;
  customerInvoiceEmailSentAt?: string | null;
  customerInvoiceEmailError?: string | null;
  customerInvoiceRetryCount?: number | null;
  vouchers: AdminVoucherRow[];
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

export type AdminVoucherRow = {
  id: string;
  voucherNumber: string;
  voucherType: PaymentVoucherType;
  status: PaymentVoucherStatus;
  recipientName: string;
  bookingId?: string | null;
  amount: number;
  issuedAt?: string | null;
  emailSentAt?: string | null;
  emailError?: string | null;
  retryCount: number;
  voucherUrl: string;
  reservationMarkedForDeletion?: boolean | null;
};

export type AdminPayoutRow = {
  id: string;
  bookingId?: string | null;
  ownerName: string;
  studioName: string;
  vendorConfigured: boolean;
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

function readBillingSnapshot(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const snapshot = value as Record<string, unknown>;
  return {
    companyName: typeof snapshot.companyName === "string" ? snapshot.companyName : null,
    gstin: typeof snapshot.gstin === "string" ? snapshot.gstin : null,
    billingAddress: typeof snapshot.billingAddress === "string" ? snapshot.billingAddress : null,
  };
}

export async function getAdminBookingOperations(
  params: { page?: number; pageSize?: number; tab?: AdminBookingTab } = {}
) {
  const currentUser = await getCurrentUser();
  if (!currentUser || !isAdmin(currentUser.role)) {
    throw new Error("Unauthorized");
  }

  const page = typeof params.page === "number" && Number.isFinite(params.page)
    ? Math.max(1, Math.floor(params.page))
    : 1;
  const pageSize = typeof params.pageSize === "number" && Number.isFinite(params.pageSize)
    ? Math.min(100, Math.max(10, Math.floor(params.pageSize)))
    : 20;
  const tab = params.tab || "bookings";
  const ownerInvoiceWhere: Prisma.InvoiceWhereInput = {
    documentType: { in: ["OWNER_MONTHLY_COMMISSION_INVOICE", "OWNER_MONTHLY_BILL_OF_SUPPLY"] },
  };
  const visibleFailureWhere: Prisma.InvoiceWhereInput = {
    AND: [
      {
        OR: [
          { status: { in: ["EMAIL_FAILED", "DELIVERY_BLOCKED", "RETRYING"] } },
          { emailError: { not: null } },
        ],
      },
      {
        OR: [
          ownerInvoiceWhere,
          { reservation: { markedForDeletion: false } },
        ],
      },
    ],
  };
  const payoutWhere: Prisma.TransactionWhereInput = {
    OR: [
      { payoutAmountToOwner: { not: null } },
      { payoutSplitAt: { not: null } },
      { payoutDoneAt: { not: null } },
    ],
  };
  const visibleVoucherWhere: Prisma.PaymentVoucherWhereInput = {
    OR: [
      { reservationId: null },
      { reservation: { markedForDeletion: false } },
    ],
  };
  const auditWhere: Prisma.AuditLogWhereInput = { resource: { in: ["Invoice", "PaymentVoucher"] } };
  const customerInvoiceWhere: Prisma.InvoiceWhereInput = {
    documentType: { in: ["CUSTOMER_STUDIO_TAX_INVOICE", "CUSTOMER_ARKANET_TAX_INVOICE"] },
    reservation: { markedForDeletion: false },
  };
  const invoiceWhere = tab === "ownerInvoices" ? ownerInvoiceWhere : visibleFailureWhere;
  const skip = (page - 1) * pageSize;

  const [
    reservations,
    bookingTotal,
    invoices,
    payouts,
    paymentVouchers,
    audits,
    ownerInvoiceTotal,
    voucherTotal,
    payoutTotal,
    failureTotal,
    auditTotal,
    customerInvoiceTotal,
    pendingCustomerInvoiceTotal,
  ] = await Promise.all([
    tab === "bookings" ? prisma.reservation.findMany({
      where: { markedForDeletion: false },
      select: {
        id: true,
        bookingId: true,
        totalPrice: true,
        startDate: true,
        startTime: true,
        endTime: true,
        createdAt: true,
        status: true,
        checkedInAt: true,
        completedAt: true,
        noShowAt: true,
        refundAmount: true,
        refundRecordedAt: true,
        rejectReason: true,
        selectedAddons: true,
        pricingSnapshot: true,
        setIds: true,
        setPackageId: true,
        billingSnapshot: true,
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
          where: { purpose: "BASE_BOOKING" },
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
        extensionRequests: {
          select: {
            id: true,
            status: true,
            extraAmount: true,
            requestedEndTime: true,
          },
        },
        additionalCharges: {
          select: {
            id: true,
            type: true,
            status: true,
            totalAmount: true,
            note: true,
          },
        },
        invoices: {
          where: {
            documentType: {
              in: ["CUSTOMER_STUDIO_TAX_INVOICE", "CUSTOMER_ARKANET_TAX_INVOICE"],
            },
            transaction: { is: { purpose: "BASE_BOOKING" } },
          },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            invoiceUrl: true,
            emailSentAt: true,
            emailError: true,
            retryCount: true,
          },
        },
        paymentVouchers: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            voucherNumber: true,
            voucherType: true,
            status: true,
            amount: true,
            issuedAt: true,
            emailSentAt: true,
            emailError: true,
            retryCount: true,
            voucherUrl: true,
            user: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }) : Promise.resolve([]),
    prisma.reservation.count({ where: { markedForDeletion: false } }),
    (tab === "ownerInvoices" || tab === "failures") ? prisma.invoice.findMany({
      where: invoiceWhere,
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
      skip,
      take: pageSize,
    }) : Promise.resolve([]),
    tab === "payouts" ? prisma.transaction.findMany({
      where: payoutWhere,
      select: {
        id: true,
        bookingId: true,
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
                user: {
                  select: {
                    name: true,
                    email: true,
                    paymentDetails: { select: { cashfreeVendorId: true, vendorIdIV: true } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }) : Promise.resolve([]),
    tab === "vouchers" ? prisma.paymentVoucher.findMany({
      where: visibleVoucherWhere,
      select: {
        id: true,
        voucherNumber: true,
        voucherType: true,
        status: true,
        amount: true,
        issuedAt: true,
        emailSentAt: true,
        emailError: true,
        retryCount: true,
        voucherUrl: true,
        user: { select: { name: true, email: true } },
        reservation: { select: { bookingId: true, markedForDeletion: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }) : Promise.resolve([]),
    tab === "audit" ? prisma.auditLog.findMany({
      where: auditWhere,
      select: {
        id: true,
        action: true,
        resourceId: true,
        createdAt: true,
        metadata: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }) : Promise.resolve([]),
    prisma.invoice.count({ where: ownerInvoiceWhere }),
    prisma.paymentVoucher.count({ where: visibleVoucherWhere }),
    prisma.transaction.count({ where: payoutWhere }),
    prisma.invoice.count({ where: visibleFailureWhere }),
    prisma.auditLog.count({ where: auditWhere }),
    prisma.invoice.count({ where: customerInvoiceWhere }),
    prisma.invoice.count({
      where: {
        ...customerInvoiceWhere,
        OR: [{ emailSentAt: null }, { emailSentAt: { isSet: false } }],
      },
    }),
  ]);

  const bookingRows: AdminBookingRow[] = reservations.map((reservation) => {
    const transaction = reservation.Transaction[0];
    const customerInvoice = reservation.invoices[0];
    const billing = readBillingSnapshot(reservation.billingSnapshot) || reservation.billingDetail;
    const endAt = parseReservationEndTimeForDate(reservation.startDate, reservation.endTime);
    const unverifiedPast =
      reservation.status === "CONFIRMED" &&
      !reservation.checkedInAt &&
      Boolean(endAt && endAt.getTime() + 2 * 60 * 60 * 1000 <= Date.now());
    const postBookingPayments = [
      ...reservation.extensionRequests.map((extension) => ({
        id: extension.id,
        kind: "EXTENSION" as const,
        status: extension.status,
        amount: extension.extraAmount,
        detail: `Until ${extension.requestedEndTime}`,
      })),
      ...reservation.additionalCharges.map((charge) => ({
        id: charge.id,
        kind: charge.type,
        status: charge.status,
        amount: charge.totalAmount,
        detail: charge.note,
      })),
    ];
    const reviewRequiredPaymentCount = postBookingPayments.filter((payment) => payment.status === "PAYMENT_REVIEW_REQUIRED").length;
    const pendingPostBookingPaymentCount = postBookingPayments.filter((payment) => payment.status === "PENDING_PAYMENT").length;
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
      lifecycleStatus: reservation.status,
      checkedInAt: iso(reservation.checkedInAt),
      completedAt: iso(reservation.completedAt),
      noShowAt: iso(reservation.noShowAt),
      refundAmount: reservation.refundAmount,
      refundRecordedAt: iso(reservation.refundRecordedAt),
      unverifiedPast,
      reviewRequiredPaymentCount,
      pendingPostBookingPaymentCount,
      paymentStatus: transaction?.status || "NO_PAYMENT",
      gstModel,
      gstOwner: transaction?.gstOwnedBy,
      customerInvoiceId: customerInvoice?.id,
      customerInvoiceNumber: customerInvoice?.invoiceNumber,
      customerInvoiceStatus: customerInvoice?.status,
      customerInvoiceUrl: customerInvoice?.invoiceUrl,
      customerInvoiceEmailSentAt: iso(customerInvoice?.emailSentAt),
      customerInvoiceEmailError: customerInvoice?.emailError,
      customerInvoiceRetryCount: customerInvoice?.retryCount,
      vouchers: reservation.paymentVouchers.map((voucher) => ({
        id: voucher.id,
        voucherNumber: voucher.voucherNumber,
        voucherType: voucher.voucherType,
        status: voucher.status,
        recipientName: voucher.user.name || voucher.user.email || "Recipient",
        bookingId: reservation.bookingId,
        amount: voucher.amount,
        issuedAt: iso(voucher.issuedAt),
        emailSentAt: iso(voucher.emailSentAt),
        emailError: voucher.emailError,
        retryCount: voucher.retryCount,
        voucherUrl: voucher.voucherUrl,
        reservationMarkedForDeletion: false,
      })),
      detail: {
        startTime: reservation.startTime,
        endTime: reservation.endTime,
        createdAt: reservation.createdAt.toISOString(),
        rejectReason: reservation.rejectReason,
        billingCompany: billing?.companyName,
        billingGstin: billing?.gstin,
        billingAddress: billing?.billingAddress,
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
        postBookingPayments,
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

  const voucherRows: AdminVoucherRow[] = paymentVouchers.map((voucher) => ({
    id: voucher.id,
    voucherNumber: voucher.voucherNumber,
    voucherType: voucher.voucherType,
    status: voucher.status,
    recipientName: voucher.user.name || voucher.user.email || "Recipient",
    bookingId: voucher.reservation?.bookingId,
    reservationMarkedForDeletion: voucher.reservation?.markedForDeletion,
    amount: voucher.amount,
    issuedAt: iso(voucher.issuedAt),
    emailSentAt: iso(voucher.emailSentAt),
    emailError: voucher.emailError,
    retryCount: voucher.retryCount,
    voucherUrl: voucher.voucherUrl,
  }));

  const payoutRows: AdminPayoutRow[] = payouts.map((txn) => ({
    id: txn.id,
    bookingId: txn.bookingId || txn.reservation?.bookingId,
    ownerName: txn.reservation?.listing.user.name || txn.reservation?.listing.user.email || "Owner",
    studioName: txn.reservation?.listing.title || "Studio",
    vendorConfigured: Boolean(
      txn.reservation?.listing.user.paymentDetails?.cashfreeVendorId
      && txn.reservation.listing.user.paymentDetails.vendorIdIV
    ),
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
    activeTab: tab,
    operationPage: page,
    operationPageSize: pageSize,
    operationTotal: {
      bookings: bookingTotal,
      ownerInvoices: ownerInvoiceTotal,
      vouchers: voucherTotal,
      payouts: payoutTotal,
      failures: failureTotal,
      audit: auditTotal,
    }[tab],
    tabCounts: {
      bookings: bookingTotal,
      ownerInvoices: ownerInvoiceTotal,
      vouchers: voucherTotal,
      payouts: payoutTotal,
      failures: failureTotal,
      audit: auditTotal,
    },
    customerInvoiceTotal,
    pendingCustomerInvoiceTotal,
    bookings: bookingRows,
    bookingPage: page,
    bookingPageSize: pageSize,
    bookingTotal,
    customerInvoices: activeBookingCustomerInvoices,
    ownerInvoices: ownerInvoiceRows,
    vouchers: voucherRows.filter((voucher) => voucher.reservationMarkedForDeletion !== true),
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

export const retryAdminVoucherEmailAction = createAction(
  z.object({ voucherId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid voucher ID") }),
  { requireAuth: true, allowedRoles: [UserRole.ADMIN] },
  async ({ voucherId }) => {
    const voucher = await PaymentVoucherService.retryVoucherEmail(voucherId);
    return { voucherId: voucher.id, status: voucher.status };
  }
);
