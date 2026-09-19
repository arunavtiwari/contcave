"use server";

import { PaymentDetails, Prisma } from "@prisma/client";
import { z } from "zod";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { createAction } from "@/lib/actions-utils";
import { decryptPaymentDetailsInternal } from "@/lib/payment-details";
import prisma from "@/lib/prismadb";
import { isAdmin } from "@/lib/user/permissions";
import { UserRole } from "@/types/user";

export type AdminOwnerTab = "all" | "verified" | "pending" | "withListings" | "gstRegistered";

export interface AdminOwnerListingSummary {
  id: string;
  title: string;
  status: string;
  active: boolean;
  price: number;
  locationValue: string;
  category: string;
}

export interface AdminOwnerRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  profileImage: string | null;
  createdAt: string;

  // Verification
  isVerified: boolean;
  verificationStage: number;
  phoneVerified: boolean;
  emailVerified: boolean;
  aadhaarVerified: boolean;
  aadhaarLast4: string | null;
  bankVerified: boolean;
  bankVerifiedName: string | null;
  verifiedVia: string[];
  verifiedAt: string | null;

  // Financial & KYC
  hasPaymentDetails: boolean;
  bankName: string;
  accountHolderName: string;
  accountNumberMasked: string;
  ifscCode: string;
  gstin: string;
  companyName: string;
  companyAddress: string;
  cashfreeVendorId: string;

  // Platform Metrics
  listingsCount: number;
  activeListingsCount: number;
  listings: AdminOwnerListingSummary[];
  totalBookingsCount: number;
  completedBookingsCount: number;
  totalRevenue: number;
  googleCalendarConnected: boolean;
}

export interface AdminOwnersSummary {
  totalOwners: number;
  verifiedOwners: number;
  pendingOwners: number;
  activeStudios: number;
  totalBookings: number;
  totalRevenue: number;
}

export interface AdminOwnersPageData {
  owners: AdminOwnerRow[];
  total: number;
  page: number;
  pageSize: number;
  activeTab: AdminOwnerTab;
  tabCounts: Record<AdminOwnerTab, number>;
  summary: AdminOwnersSummary;
}

function maskAccountNumber(acc?: string | null): string {
  if (!acc) return "-";
  const trimmed = acc.trim();
  if (trimmed.length <= 4) return trimmed;
  return `••••${trimmed.slice(-4)}`;
}

export async function getAdminOwnersOperations(params: {
  tab?: AdminOwnerTab;
  page?: number;
  pageSize?: number;
  search?: string;
}): Promise<AdminOwnersPageData> {
  const currentUser = await getCurrentUser();
  if (!currentUser || !isAdmin(currentUser.role)) {
    throw new Error("Unauthorized");
  }

  const tab = params.tab || "all";
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.max(1, Math.min(100, params.pageSize || 10));
  const search = params.search?.trim() || "";

  // Base condition: User is an OWNER or has at least one studio listing
  const baseWhere: Prisma.UserWhereInput = {
    markedForDeletion: false,
    OR: [
      { role: UserRole.OWNER },
      { listings: { some: {} } },
    ],
  };

  // Fetch all qualifying owners with their relations to calculate stats and tabs accurately
  const allOwners = await prisma.user.findMany({
    where: baseWhere,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      location: true,
      profileImage: true,
      image: true,
      createdAt: true,
      is_verified: true,
      verification_stage: true,
      phone_verified: true,
      email_verified: true,
      aadhaar_verified: true,
      aadhaar_last4: true,
      bank_verified: true,
      bank_verified_name: true,
      verified_via: true,
      verified_at: true,
      googleCalendarConnected: true,
      paymentDetails: true,
      listings: {
        where: { archivedAt: null },
        select: {
          id: true,
          title: true,
          status: true,
          active: true,
          price: true,
          locationValue: true,
          category: true,
          reservations: {
            where: { markedForDeletion: false },
            select: {
              id: true,
              totalPrice: true,
              status: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Map and serialize owner rows
  const mappedRows: AdminOwnerRow[] = allOwners.map((user) => {
    let decryptedGstin = "";
    let decryptedBankName = "";
    let decryptedAccountHolder = "";
    let decryptedAccountNumber = "";
    let decryptedIfsc = "";
    let decryptedCompanyName = "";
    let decryptedCompanyAddress = "";
    let decryptedVendorId = "";

    if (user.paymentDetails) {
      try {
        const decrypted = decryptPaymentDetailsInternal(user.paymentDetails as PaymentDetails);
        if (decrypted) {
          decryptedGstin = decrypted.gstin || "";
          decryptedBankName = decrypted.bankName || "";
          decryptedAccountHolder = decrypted.accountHolderName || "";
          decryptedAccountNumber = decrypted.accountNumber || "";
          decryptedIfsc = decrypted.ifscCode || "";
          decryptedCompanyName = decrypted.companyName || "";
          decryptedCompanyAddress = decrypted.companyAddress || "";
          decryptedVendorId = decrypted.cashfreeVendorId || "";
        }
      } catch {
        // Leave defaults if decryption fails
      }
    }

    const listingsSummary: AdminOwnerListingSummary[] = user.listings.map((l) => ({
      id: l.id,
      title: l.title,
      status: l.status,
      active: Boolean(l.active),
      price: l.price || 0,
      locationValue: l.locationValue,
      category: l.category,
    }));

    const allReservations = user.listings.flatMap((l) => l.reservations);
    const completedOrConfirmed = allReservations.filter((r) =>
      ["CONFIRMED", "CHECKED_IN", "COMPLETED"].includes(r.status)
    );
    const totalRevenue = completedOrConfirmed.reduce((sum, r) => sum + (r.totalPrice || 0), 0);

    return {
      id: user.id,
      name: user.name || "Unnamed Host",
      email: user.email || "",
      phone: user.phone || "",
      location: user.location || "",
      profileImage: user.profileImage || user.image || null,
      createdAt: user.createdAt.toISOString(),

      isVerified: Boolean(user.is_verified || user.verification_stage >= 3),
      verificationStage: user.verification_stage,
      phoneVerified: Boolean(user.phone_verified),
      emailVerified: Boolean(user.email_verified),
      aadhaarVerified: Boolean(user.aadhaar_verified),
      aadhaarLast4: user.aadhaar_last4 || null,
      bankVerified: Boolean(user.bank_verified),
      bankVerifiedName: user.bank_verified_name || null,
      verifiedVia: user.verified_via || [],
      verifiedAt: user.verified_at ? user.verified_at.toISOString() : null,

      hasPaymentDetails: Boolean(user.paymentDetails),
      bankName: decryptedBankName,
      accountHolderName: decryptedAccountHolder,
      accountNumberMasked: maskAccountNumber(decryptedAccountNumber),
      ifscCode: decryptedIfsc,
      gstin: decryptedGstin,
      companyName: decryptedCompanyName,
      companyAddress: decryptedCompanyAddress,
      cashfreeVendorId: decryptedVendorId,

      listingsCount: user.listings.length,
      activeListingsCount: user.listings.filter((l) => l.active && l.status === "VERIFIED").length,
      listings: listingsSummary,
      totalBookingsCount: allReservations.length,
      completedBookingsCount: completedOrConfirmed.length,
      totalRevenue,
      googleCalendarConnected: Boolean(user.googleCalendarConnected),
    };
  });

  // Calculate tab counts
  const tabCounts: Record<AdminOwnerTab, number> = {
    all: mappedRows.length,
    verified: mappedRows.filter((o) => o.isVerified).length,
    pending: mappedRows.filter((o) => !o.isVerified).length,
    withListings: mappedRows.filter((o) => o.listingsCount > 0).length,
    gstRegistered: mappedRows.filter((o) => Boolean(o.gstin)).length,
  };

  // Calculate high-level platform summary metrics
  const totalActiveStudios = mappedRows.reduce((sum, o) => sum + o.activeListingsCount, 0);
  const totalBookingsAll = mappedRows.reduce((sum, o) => sum + o.completedBookingsCount, 0);
  const totalRevenueAll = mappedRows.reduce((sum, o) => sum + o.totalRevenue, 0);

  const summary: AdminOwnersSummary = {
    totalOwners: mappedRows.length,
    verifiedOwners: tabCounts.verified,
    pendingOwners: tabCounts.pending,
    activeStudios: totalActiveStudios,
    totalBookings: totalBookingsAll,
    totalRevenue: totalRevenueAll,
  };

  // Filter by Tab
  let filteredRows = mappedRows;
  if (tab === "verified") {
    filteredRows = mappedRows.filter((o) => o.isVerified);
  } else if (tab === "pending") {
    filteredRows = mappedRows.filter((o) => !o.isVerified);
  } else if (tab === "withListings") {
    filteredRows = mappedRows.filter((o) => o.listingsCount > 0);
  } else if (tab === "gstRegistered") {
    filteredRows = mappedRows.filter((o) => Boolean(o.gstin));
  }

  // Filter by search query if provided
  if (search) {
    const q = search.toLowerCase();
    filteredRows = filteredRows.filter((o) =>
      o.name.toLowerCase().includes(q) ||
      o.email.toLowerCase().includes(q) ||
      o.phone.toLowerCase().includes(q) ||
      o.location.toLowerCase().includes(q) ||
      o.gstin.toLowerCase().includes(q) ||
      o.listings.some((l) => l.title.toLowerCase().includes(q))
    );
  }

  const totalFiltered = filteredRows.length;
  const startIndex = (page - 1) * pageSize;
  const paginatedRows = filteredRows.slice(startIndex, startIndex + pageSize);

  return {
    owners: paginatedRows,
    total: totalFiltered,
    page,
    pageSize,
    activeTab: tab,
    tabCounts,
    summary,
  };
}

export const getAdminOwnerDetailAction = createAction(
  z.object({ ownerId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid owner ID") }),
  { requireAuth: true, allowedRoles: [UserRole.ADMIN] },
  async ({ ownerId }) => {
    const owner = await prisma.user.findUnique({
      where: { id: ownerId },
      include: {
        paymentDetails: true,
        listings: {
          where: { archivedAt: null },
          include: {
            packages: true,
            reservations: {
              where: { markedForDeletion: false },
              take: 10,
              orderBy: { createdAt: "desc" },
              select: {
                id: true,
                bookingId: true,
                startDate: true,
                startTime: true,
                endTime: true,
                totalPrice: true,
                status: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    if (!owner) throw new Error("Space owner not found");

    let decryptedPayment: ReturnType<typeof decryptPaymentDetailsInternal> | null = null;
    if (owner.paymentDetails) {
      try {
        decryptedPayment = decryptPaymentDetailsInternal(owner.paymentDetails as PaymentDetails);
      } catch {
        decryptedPayment = null;
      }
    }

    return {
      id: owner.id,
      name: owner.name || "Unnamed Host",
      email: owner.email || "",
      phone: owner.phone || "",
      location: owner.location || "",
      profileImage: owner.profileImage || owner.image || null,
      createdAt: owner.createdAt.toISOString(),
      isVerified: Boolean(owner.is_verified || owner.verification_stage >= 3),
      verificationStage: owner.verification_stage,
      phoneVerified: Boolean(owner.phone_verified),
      emailVerified: Boolean(owner.email_verified),
      aadhaarVerified: Boolean(owner.aadhaar_verified),
      aadhaarLast4: owner.aadhaar_last4 || null,
      bankVerified: Boolean(owner.bank_verified),
      bankVerifiedName: owner.bank_verified_name || null,
      googleCalendarConnected: Boolean(owner.googleCalendarConnected),
      paymentDetails: decryptedPayment
        ? {
            bankName: decryptedPayment.bankName || "",
            accountHolderName: decryptedPayment.accountHolderName || "",
            accountNumberMasked: maskAccountNumber(decryptedPayment.accountNumber),
            ifscCode: decryptedPayment.ifscCode || "",
            gstin: decryptedPayment.gstin || "",
            companyName: decryptedPayment.companyName || "",
            companyAddress: decryptedPayment.companyAddress || "",
            cashfreeVendorId: decryptedPayment.cashfreeVendorId || "",
          }
        : null,
      listings: owner.listings.map((l) => ({
        id: l.id,
        title: l.title,
        status: l.status,
        active: Boolean(l.active),
        price: l.price || 0,
        locationValue: l.locationValue,
        category: l.category,
        carpetArea: l.carpetArea || null,
        packagesCount: l.packages.length,
        reservations: l.reservations.map((r) => ({
          id: r.id,
          bookingId: r.bookingId,
          startDate: r.startDate.toISOString(),
          startTime: r.startTime,
          endTime: r.endTime,
          totalPrice: r.totalPrice,
          status: r.status,
          createdAt: r.createdAt.toISOString(),
        })),
      })),
    };
  }
);
