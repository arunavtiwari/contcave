"use server";

import { InvoiceDocumentType, InvoiceStatus, PaymentVoucherStatus, PaymentVoucherType, Prisma, ReservationStatus, TransactionStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { createAction } from "@/lib/actions-utils";
import {
  createOfflineBooking,
  getAdminStudioForOfflineBooking,
  getAdminStudiosForOfflineBooking,
} from "@/lib/admin/offlineBooking";
import { UserFacingError } from "@/lib/errors";
import { InvoiceService } from "@/lib/invoice/service";
import { PaymentVoucherService } from "@/lib/payment-voucher/service";
import prisma from "@/lib/prismadb";
import { isAdmin } from "@/lib/user/permissions";
import { createAdminOfflineBookingSchema } from "@/schemas/offlineBooking";
import { UserRole } from "@/types/user";

type AdminGstModel = "GST_STUDIO_AGENT" | "NON_GST_PRINCIPAL" | "UNKNOWN";
export type AdminBookingTab = "bookings" | "ownerInvoices" | "vouchers" | "payouts" | "failures" | "audit";

/**
 * Everything the booking drawer shows and the table does not. Kept out of the list
 * response because addon lists, pricing snapshots, sets and packages are large per row
 * and only ever read for the one booking an admin opens.
 */
export type AdminBookingDetail = {
  createdAt: string;
  gstModel: AdminGstModel;
  gstOwner?: string | null;
  vouchers: AdminVoucherRow[];
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

/** Exactly the columns the bookings table renders — nothing is fetched to be discarded. */
export type AdminBookingRow = {
  id: string;
  bookingId: string;
  customerName: string;
  ownerName: string;
  studioName: string;
  studioLocation: string;
  amount: number;
  startDate: string;
  startTime: string;
  endTime: string;
  lifecycleStatus: ReservationStatus;
  paymentStatus: TransactionStatus | "NO_PAYMENT";
  customerInvoiceNumber?: string | null;
  customerInvoiceId?: string | null;
  customerInvoiceStatus?: InvoiceStatus | null;
  customerInvoiceUrl?: string | null;
  customerInvoiceEmailSentAt?: string | null;
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

const OWNER_INVOICE_TYPES = ["OWNER_MONTHLY_COMMISSION_INVOICE", "OWNER_MONTHLY_BILL_OF_SUPPLY"];
const CUSTOMER_INVOICE_TYPES = ["CUSTOMER_STUDIO_TAX_INVOICE", "CUSTOMER_ARKANET_TAX_INVOICE"];
const FAILED_INVOICE_STATUSES = ["EMAIL_FAILED", "DELIVERY_BLOCKED", "RETRYING"];

const ownerInvoiceWhere: Prisma.InvoiceWhereInput = {
  documentType: { in: ["OWNER_MONTHLY_COMMISSION_INVOICE", "OWNER_MONTHLY_BILL_OF_SUPPLY"] },
};
const visibleFailureWhere: Prisma.InvoiceWhereInput = {
  OR: [
    { status: { in: ["EMAIL_FAILED", "DELIVERY_BLOCKED", "RETRYING"] } },
    { emailError: { not: null } },
  ],
};
const payoutWhere: Prisma.TransactionWhereInput = {
  OR: [
    { payoutAmountToOwner: { not: null } },
    { payoutSplitAt: { not: null } },
    { payoutDoneAt: { not: null } },
  ],
};
const auditWhere: Prisma.AuditLogWhereInput = { resource: { in: ["Invoice", "PaymentVoucher"] } };

type InvoiceCounts = {
  ownerInvoices: number;
  failures: number;
  customerInvoices: number;
  pendingCustomerInvoices: number;
};

/**
 * The four invoice tallies behind the stat cards and tab badges differ only by their
 * filter, so a single `$facet` answers all of them in one round trip instead of four.
 */
async function getInvoiceCounts(): Promise<InvoiceCounts> {
  const result = (await prisma.invoice.aggregateRaw({
    pipeline: [
      {
        $facet: {
          ownerInvoices: [{ $match: { documentType: { $in: OWNER_INVOICE_TYPES } } }, { $count: "total" }],
          failures: [
            {
              $match: {
                $or: [
                  { status: { $in: FAILED_INVOICE_STATUSES } },
                  { emailError: { $ne: null } },
                ],
              },
            },
            { $count: "total" },
          ],
          customerInvoices: [{ $match: { documentType: { $in: CUSTOMER_INVOICE_TYPES } } }, { $count: "total" }],
          pendingCustomerInvoices: [
            {
              $match: {
                documentType: { $in: CUSTOMER_INVOICE_TYPES },
                $or: [{ emailSentAt: null }, { emailSentAt: { $exists: false } }],
              },
            },
            { $count: "total" },
          ],
        },
      },
    ] as unknown as Prisma.InputJsonValue[],
  })) as unknown as Array<Record<keyof InvoiceCounts, Array<{ total?: number }> | undefined>>;

  const facet = result[0];
  const read = (key: keyof InvoiceCounts) => facet?.[key]?.[0]?.total ?? 0;

  return {
    ownerInvoices: read("ownerInvoices"),
    failures: read("failures"),
    customerInvoices: read("customerInvoices"),
    pendingCustomerInvoices: read("pendingCustomerInvoices"),
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
  const invoiceWhere = tab === "ownerInvoices" ? ownerInvoiceWhere : visibleFailureWhere;
  const skip = (page - 1) * pageSize;

  const [
    reservations,
    bookingTotal,
    invoices,
    payouts,
    paymentVouchers,
    audits,
    invoiceCounts,
    voucherTotal,
    payoutTotal,
    auditTotal,
  ] = await Promise.all([
    tab === "bookings" ? prisma.reservation.findMany({
      select: {
        id: true,
        bookingId: true,
        totalPrice: true,
        startDate: true,
        startTime: true,
        endTime: true,
        status: true,
        user: { select: { name: true, email: true } },
        listing: {
          select: {
            title: true,
            locationValue: true,
            user: { select: { name: true, email: true } },
          },
        },
        Transaction: {
          where: { purpose: "BASE_BOOKING" },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { status: true },
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
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }) : Promise.resolve([]),
    prisma.reservation.count(),
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
    getInvoiceCounts(),
    prisma.paymentVoucher.count(),
    prisma.transaction.count({ where: payoutWhere }),
    prisma.auditLog.count({ where: auditWhere }),
  ]);

  const bookingRows: AdminBookingRow[] = reservations.map((reservation) => {
    const transaction = reservation.Transaction[0];
    const customerInvoice = reservation.invoices[0];

    return {
      id: reservation.id,
      bookingId: reservation.bookingId,
      customerName: reservation.user.name || reservation.user.email || "Customer",
      ownerName: reservation.listing.user.name || reservation.listing.user.email || "Owner",
      studioName: reservation.listing.title,
      studioLocation: reservation.listing.locationValue,
      amount: reservation.totalPrice,
      startDate: reservation.startDate.toISOString(),
      startTime: reservation.startTime,
      endTime: reservation.endTime,
      lifecycleStatus: reservation.status,
      paymentStatus: transaction?.status || "NO_PAYMENT",
      customerInvoiceId: customerInvoice?.id,
      customerInvoiceNumber: customerInvoice?.invoiceNumber,
      customerInvoiceStatus: customerInvoice?.status,
      customerInvoiceUrl: customerInvoice?.invoiceUrl ? `/api/documents/invoices/${customerInvoice.id}` : undefined,
      customerInvoiceEmailSentAt: iso(customerInvoice?.emailSentAt),
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
    invoiceUrl: invoice.invoiceUrl ? `/api/documents/invoices/${invoice.id}` : "",
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
    voucherUrl: voucher.voucherUrl ? `/api/documents/vouchers/${voucher.id}` : "",
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

  const ownerInvoiceRows = invoiceRows.filter((invoice) => invoice.documentType.startsWith("OWNER_"));
  const visibleFailureRows = invoiceRows.filter((invoice) => {
    const failed = FAILED_INVOICE_STATUSES.includes(invoice.status) || Boolean(invoice.emailError);
    if (!failed) return false;
    if (invoice.documentType.startsWith("OWNER_")) return true;
    return Boolean(invoice.bookingId) && invoice.reservationMarkedForDeletion !== true;
  });

  const tabCounts = {
    bookings: bookingTotal,
    ownerInvoices: invoiceCounts.ownerInvoices,
    vouchers: voucherTotal,
    payouts: payoutTotal,
    failures: invoiceCounts.failures,
    audit: auditTotal,
  };

  return {
    activeTab: tab,
    operationPage: page,
    operationPageSize: pageSize,
    operationTotal: tabCounts[tab],
    tabCounts,
    customerInvoiceTotal: invoiceCounts.customerInvoices,
    pendingCustomerInvoiceTotal: invoiceCounts.pendingCustomerInvoices,
    bookings: bookingRows,
    bookingPage: page,
    bookingPageSize: pageSize,
    bookingTotal,
    ownerInvoices: ownerInvoiceRows,
    vouchers: voucherRows.filter((voucher) => voucher.reservationMarkedForDeletion !== true),
    failures: visibleFailureRows,
    payouts: payoutRows,
    audits: auditRows,
  };
}

/**
 * Loads the drawer payload for one booking. Splitting this out of the list keeps the
 * table's response small and skips five nested relation fetches per page that only
 * mattered for a booking nobody had opened yet.
 */
export const getAdminBookingDetailAction = createAction(
  z.object({ reservationId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid booking ID") }),
  { requireAuth: true, allowedRoles: [UserRole.ADMIN] },
  async ({ reservationId }): Promise<AdminBookingDetail> => {
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      select: {
        bookingId: true,
        createdAt: true,
        rejectReason: true,
        selectedAddons: true,
        pricingSnapshot: true,
        setIds: true,
        setPackageId: true,
        billingSnapshot: true,
        billingDetail: {
          select: { companyName: true, gstin: true, billingAddress: true },
        },
        listing: {
          select: {
            id: true,
            locationValue: true,
            propertyStateCode: true,
            hasSets: true,
          },
        },
        Transaction: {
          where: { purpose: "BASE_BOOKING" },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
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
          select: { id: true, status: true, extraAmount: true, requestedEndTime: true },
        },
        additionalCharges: {
          select: { id: true, type: true, status: true, totalAmount: true, note: true },
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
    });

    if (!reservation) throw new UserFacingError("Booking not found", 404);

    // Only the sets and package this booking actually selected, rather than the studio's
    // full catalogue filtered down in memory.
    const [selectedSets, selectedPackage] = await Promise.all([
      reservation.setIds.length
        ? prisma.listingSet.findMany({
            where: { id: { in: reservation.setIds } },
            select: { id: true, name: true, price: true, description: true },
            orderBy: [{ position: "asc" }, { price: "asc" }],
          })
        : Promise.resolve([]),
      reservation.setPackageId
        ? prisma.package.findUnique({
            where: { id: reservation.setPackageId },
            select: {
              id: true,
              title: true,
              description: true,
              offeredPrice: true,
              durationHours: true,
              features: true,
            },
          })
        : Promise.resolve(null),
    ]);

    const transaction = reservation.Transaction[0];
    const billing = readBillingSnapshot(reservation.billingSnapshot) || reservation.billingDetail;
    const gstModel: AdminGstModel =
      transaction?.gstOwnedBy === "STUDIO"
        ? "GST_STUDIO_AGENT"
        : transaction?.gstOwnedBy === "ARKANET"
          ? "NON_GST_PRINCIPAL"
          : "UNKNOWN";

    return {
      createdAt: reservation.createdAt.toISOString(),
      gstModel,
      gstOwner: transaction?.gstOwnedBy,
      rejectReason: reservation.rejectReason,
      billingCompany: billing?.companyName,
      billingGstin: billing?.gstin,
      billingAddress: billing?.billingAddress,
      selectedAddons: reservation.selectedAddons,
      pricingSnapshot: reservation.pricingSnapshot,
      selectedSetIds: reservation.setIds,
      selectedSets,
      selectedPackage,
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
      postBookingPayments: [
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
      ],
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
        voucherUrl: voucher.voucherUrl ? `/api/documents/vouchers/${voucher.id}` : "",
        reservationMarkedForDeletion: false,
      })),
    };
  }
);

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

export const createAdminOfflineBookingAction = createAction(
  createAdminOfflineBookingSchema,
  { requireAuth: true, allowedRoles: [UserRole.ADMIN] },
  async (data, { user }) => {
    const result = await createOfflineBooking(data, user);
    revalidatePath("/admin/dashboard/bookings");
    revalidatePath("/dashboard/bookings");
    return result;
  }
);

export const getAdminStudiosForOfflineBookingAction = createAction(
  z.object({}),
  { requireAuth: true, allowedRoles: [UserRole.ADMIN] },
  async () => {
    return await getAdminStudiosForOfflineBooking();
  }
);

/** Loads sets, packages and host payout details for the one studio an admin picked. */
export const getAdminStudioForOfflineBookingAction = createAction(
  z.object({ listingId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid studio ID") }),
  { requireAuth: true, allowedRoles: [UserRole.ADMIN] },
  async ({ listingId }) => {
    const studio = await getAdminStudioForOfflineBooking(listingId);
    if (!studio) throw new UserFacingError("Studio not found", 404);
    return studio;
  }
);
