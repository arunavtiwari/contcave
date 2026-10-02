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

const EARNING_RESERVATION_STATUSES = ["CONFIRMED", "CHECKED_IN", "COMPLETED"] as const;

/**
 * `archivedAt` is an optional Mongo field that is simply absent on listings that were
 * never archived, and Prisma treats "null" and "unset" as different states — so a bare
 * `archivedAt: null` matches nothing and silently zeroes out every studio and GMV figure
 * on this page. Both states have to be spelled out.
 */
const NOT_ARCHIVED: Prisma.ListingWhereInput = {
  OR: [{ archivedAt: null }, { archivedAt: { isSet: false } }],
};

/** A user counts as verified once KYC has cleared the bank stage. */
const VERIFIED_OWNER_WHERE: Prisma.UserWhereInput = {
  OR: [{ is_verified: true }, { verification_stage: { gte: 3 } }],
};

const PENDING_OWNER_WHERE: Prisma.UserWhereInput = {
  is_verified: false,
  verification_stage: { lt: 3 },
};

/**
 * GSTINs are stored encrypted, so "is this owner GST registered?" can't be answered by
 * matching on the plaintext. The ciphertext column is only populated when a GSTIN exists,
 * which makes presence — unlike the value — answerable in the database.
 */
const GST_REGISTERED_WHERE: Prisma.UserWhereInput = {
  paymentDetails: { is: { AND: [{ gstin: { not: null } }, { gstin: { not: "" } }] } },
};

type ListingFacets = {
  ownerIdsWithAnyListing: string[];
  ownerIdsWithLiveListing: string[];
  activeStudioCount: number;
};

function readRawObjectId(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "$oid" in value) {
    const oid = (value as { $oid?: unknown }).$oid;
    return typeof oid === "string" ? oid : null;
  }
  return null;
}

/**
 * One aggregation answers every listing-shaped question this page asks: which users own a
 * listing at all (the definition of "space owner" alongside the OWNER role), which own a
 * live one, and how many studios are bookable platform-wide. Asking them separately meant
 * re-scanning the collection once per stat card and once per tab badge.
 */
async function getListingFacets(): Promise<ListingFacets> {
  const notArchived = { $or: [{ archivedAt: null }, { archivedAt: { $exists: false } }] };

  const result = (await prisma.listing.aggregateRaw({
    pipeline: [
      {
        $facet: {
          anyListing: [{ $group: { _id: "$userId" } }],
          liveListing: [{ $match: notArchived }, { $group: { _id: "$userId" } }],
          activeStudios: [
            { $match: { ...notArchived, active: true, status: "VERIFIED" } },
            { $count: "total" },
          ],
        },
      },
    ] as unknown as Prisma.InputJsonValue[],
  })) as unknown as Array<{
    anyListing?: Array<{ _id?: unknown }>;
    liveListing?: Array<{ _id?: unknown }>;
    activeStudios?: Array<{ total?: number }>;
  }>;

  const facet = result[0] || {};
  const toIds = (rows?: Array<{ _id?: unknown }>) =>
    (rows || [])
      .map((row) => readRawObjectId(row._id))
      .filter((id): id is string => Boolean(id));

  return {
    ownerIdsWithAnyListing: toIds(facet.anyListing),
    ownerIdsWithLiveListing: toIds(facet.liveListing),
    activeStudioCount: facet.activeStudios?.[0]?.total ?? 0,
  };
}

/**
 * Resolves a free-text query to the owner ids it can only match through encrypted data.
 * GSTIN can't be matched with a database `contains`, but the candidate set is just the
 * owners who have one on file, which is a small slice of the table.
 */
async function findOwnerIdsByGstin(query: string): Promise<string[]> {
  const rows = await prisma.paymentDetails.findMany({
    where: { AND: [{ gstin: { not: null } }, { gstin: { not: "" } }] },
    select: { userId: true, gstin: true, gstinIV: true },
  });

  const needle = query.toLowerCase();
  const matches: string[] = [];

  for (const row of rows) {
    try {
      const decrypted = decryptPaymentDetailsInternal(row as unknown as PaymentDetails);
      if (decrypted?.gstin?.toLowerCase().includes(needle)) matches.push(row.userId);
    } catch {
      // A record we can't decrypt simply can't match.
    }
  }

  return matches;
}

type ReservationStat = {
  listingId: string;
  status: string | null;
  count: number;
  revenue: number;
};

/**
 * Booking counts and GMV per listing, in one pass.
 *
 * This is deliberately `aggregateRaw` rather than `prisma.reservation.groupBy`: grouping a
 * MongoDB collection by two fields panics the query engine's aggregate handler, which
 * surfaces as an opaque 500 rather than a catchable error.
 */
async function getReservationStatsByListing(listingIds: string[]): Promise<ReservationStat[]> {
  if (listingIds.length === 0) return [];

  const result = (await prisma.reservation.aggregateRaw({
    pipeline: [
      {
        $match: {
          listingId: { $in: listingIds.map((id) => ({ $oid: id })) },
          markedForDeletion: { $ne: true },
        },
      },
      {
        $group: {
          _id: { listingId: "$listingId", status: "$status" },
          count: { $sum: 1 },
          revenue: { $sum: "$totalPrice" },
        },
      },
    ] as unknown as Prisma.InputJsonValue[],
  })) as unknown as Array<{
    _id?: { listingId?: unknown; status?: unknown };
    count?: number;
    revenue?: number;
  }>;

  return result.reduce<ReservationStat[]>((stats, row) => {
    const listingId = readRawObjectId(row._id?.listingId);
    if (listingId) {
      stats.push({
        listingId,
        status: typeof row._id?.status === "string" ? row._id.status : null,
        count: row.count ?? 0,
        revenue: row.revenue ?? 0,
      });
    }
    return stats;
  }, []);
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

  const facets = await getListingFacets();

  // "Space owner" means the OWNER role or at least one listing. Resolving the second half
  // to a concrete id list up front keeps every count below a plain indexed user query
  // instead of a relation subquery re-run per tab.
  const baseWhere: Prisma.UserWhereInput = {
    markedForDeletion: false,
    OR: [
      { role: UserRole.OWNER },
      { id: { in: facets.ownerIdsWithAnyListing } },
    ],
  };

  const tabWhere: Record<AdminOwnerTab, Prisma.UserWhereInput> = {
    all: {},
    verified: VERIFIED_OWNER_WHERE,
    pending: PENDING_OWNER_WHERE,
    withListings: { id: { in: facets.ownerIdsWithLiveListing } },
    gstRegistered: GST_REGISTERED_WHERE,
  };

  let searchWhere: Prisma.UserWhereInput | null = null;
  if (search) {
    const insensitive = { contains: search, mode: "insensitive" as const };
    const [listingMatches, gstinOwnerIds] = await Promise.all([
      prisma.listing.findMany({
        // Matches the studios shown against the owner, which excludes archived ones.
        where: { title: insensitive, ...NOT_ARCHIVED },
        select: { userId: true },
      }),
      findOwnerIdsByGstin(search),
    ]);

    searchWhere = {
      OR: [
        { name: insensitive },
        { email: insensitive },
        { phone: insensitive },
        { location: insensitive },
        { id: { in: [...new Set([...listingMatches.map((l) => l.userId), ...gstinOwnerIds])] } },
      ],
    };
  }

  const where: Prisma.UserWhereInput = {
    AND: [baseWhere, tabWhere[tab], ...(searchWhere ? [searchWhere] : [])],
  };

  const earningReservationWhere = {
    markedForDeletion: false,
    status: { in: [...EARNING_RESERVATION_STATUSES] },
    listing: { is: NOT_ARCHIVED },
  };

  const [
    pageUsers,
    total,
    totalOwners,
    verifiedOwners,
    withListingsCount,
    gstRegisteredCount,
    earningReservations,
  ] = await Promise.all([
    prisma.user.findMany({
      where,
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
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.count({ where }),
    prisma.user.count({ where: baseWhere }),
    prisma.user.count({ where: { AND: [baseWhere, VERIFIED_OWNER_WHERE] } }),
    prisma.user.count({ where: { AND: [baseWhere, tabWhere.withListings] } }),
    prisma.user.count({ where: { AND: [baseWhere, GST_REGISTERED_WHERE] } }),
    prisma.reservation.aggregate({
      where: earningReservationWhere,
      _count: { _all: true },
      _sum: { totalPrice: true },
    }),
  ]);

  // Per-owner studio and booking metrics are only needed for the rows actually rendered,
  // so they are gathered for this page's owners rather than the whole table.
  const pageOwnerIds = pageUsers.map((user) => user.id);
  const pageListings = pageOwnerIds.length
    ? await prisma.listing.findMany({
        where: { userId: { in: pageOwnerIds }, ...NOT_ARCHIVED },
        select: {
          id: true,
          userId: true,
          title: true,
          status: true,
          active: true,
          price: true,
          locationValue: true,
          category: true,
        },
      })
    : [];

  const pageListingIds = pageListings.map((listing) => listing.id);
  const reservationStats = await getReservationStatsByListing(pageListingIds);

  const listingsByOwner = new Map<string, typeof pageListings>();
  for (const listing of pageListings) {
    const bucket = listingsByOwner.get(listing.userId);
    if (bucket) bucket.push(listing);
    else listingsByOwner.set(listing.userId, [listing]);
  }

  const ownerByListing = new Map(pageListings.map((listing) => [listing.id, listing.userId]));
  const metricsByOwner = new Map<string, { bookings: number; completed: number; revenue: number }>();
  for (const stat of reservationStats) {
    const ownerId = ownerByListing.get(stat.listingId);
    if (!ownerId) continue;

    const metrics = metricsByOwner.get(ownerId) || { bookings: 0, completed: 0, revenue: 0 };
    metrics.bookings += stat.count;
    if (stat.status && (EARNING_RESERVATION_STATUSES as readonly string[]).includes(stat.status)) {
      metrics.completed += stat.count;
      metrics.revenue += stat.revenue;
    }
    metricsByOwner.set(ownerId, metrics);
  }

  const owners: AdminOwnerRow[] = pageUsers.map((user) => {
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

    const ownerListings = listingsByOwner.get(user.id) || [];
    const metrics = metricsByOwner.get(user.id) || { bookings: 0, completed: 0, revenue: 0 };

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

      listingsCount: ownerListings.length,
      activeListingsCount: ownerListings.filter((l) => l.active && l.status === "VERIFIED").length,
      listings: ownerListings.map((l) => ({
        id: l.id,
        title: l.title,
        status: l.status,
        active: Boolean(l.active),
        price: l.price || 0,
        locationValue: l.locationValue,
        category: l.category,
      })),
      totalBookingsCount: metrics.bookings,
      completedBookingsCount: metrics.completed,
      totalRevenue: metrics.revenue,
      googleCalendarConnected: Boolean(user.googleCalendarConnected),
    };
  });

  const tabCounts: Record<AdminOwnerTab, number> = {
    all: totalOwners,
    verified: verifiedOwners,
    pending: totalOwners - verifiedOwners,
    withListings: withListingsCount,
    gstRegistered: gstRegisteredCount,
  };

  const summary: AdminOwnersSummary = {
    totalOwners,
    verifiedOwners,
    pendingOwners: totalOwners - verifiedOwners,
    activeStudios: facets.activeStudioCount,
    totalBookings: earningReservations._count._all,
    totalRevenue: earningReservations._sum.totalPrice || 0,
  };

  return {
    owners,
    total,
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
        googleCalendarConnected: true,
        paymentDetails: true,
        listings: {
          where: NOT_ARCHIVED,
          select: {
            id: true,
            title: true,
            status: true,
            active: true,
            price: true,
            locationValue: true,
            category: true,
            carpetArea: true,
            // Only the tally is rendered, so the package rows themselves are never loaded.
            _count: { select: { packages: true } },
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
        packagesCount: l._count.packages,
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
