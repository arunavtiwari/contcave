import "server-only";

import { PaymentDetails, Prisma } from "@prisma/client";

import { getGstStateCodeFromStateName, isValidGstStateCode } from "@/constants/gstStateCodes";
import { parseTimeToMinutes } from "@/lib/availability";
import { UserFacingError } from "@/lib/errors";
import { decryptPaymentDetailsInternal } from "@/lib/payment-details";
import { type GstOwner, gstOwnerFor } from "@/lib/payout/utils";
import { addGst } from "@/lib/pricing";
import prisma from "@/lib/prismadb";
import { ReservationService } from "@/lib/reservation/service";
import { isReservationSlotUniqueConflict, LISTING_WIDE_SLOT_ID } from "@/lib/reservation/slots";
import { asEndOfDayMinutes } from "@/lib/scheduling";
import { generateBookingId } from "@/lib/utils";
import { CreateAdminOfflineBookingInput } from "@/schemas/offlineBooking";
import { SafeUser, UserRole } from "@/types/user";

export interface AdminStudioSetOption {
  id: string;
  name: string;
  price: number;
  position: number;
}

export interface AdminStudioPackageOption {
  id: string;
  title: string;
  durationHours: number;
  offeredPrice: number;
  originalPrice?: number;
  eligibleSetIds?: string[];
  requiredSetCount?: number | null;
  fixedAddOn?: number | null;
}

/** What the studio dropdown renders. Cheap to load for every studio on the platform. */
export interface AdminStudioSummary {
  id: string;
  title: string;
  hostName: string;
  address: string;
}

export interface AdminStudioOption {
  id: string;
  title: string;
  hostId: string;
  hostName: string;
  hostEmail: string;
  hostPhone: string;
  hostIsVerified: boolean;
  hostBankVerified: boolean;
  hostBankVerifiedName?: string;
  bankAccountLast4?: string;
  bankIfsc?: string;
  address: string;
  propertyStateCode: string;
  price: number;
  gstin: string;
  gstOwner: GstOwner;
  hasSets: boolean;
  setsHaveSamePrice: boolean;
  unifiedSetPrice: number | null;
  additionalSetPricingType: "FIXED" | "HOURLY" | null;
  sets: AdminStudioSetOption[];
  packages: AdminStudioPackageOption[];
}

export interface OfflineBookingCreationResult {
  bookingId: string;
  reservationId: string;
  invoiceNumber?: string;
  emailSent: boolean;
  whatsappSent: boolean;
}

const NOT_ARCHIVED: Prisma.ListingWhereInput = {
  OR: [{ archivedAt: null }, { archivedAt: { isSet: false } }],
};

/** The studio address shown in the selector, preferring the geocoded display name. */
function studioAddress(listing: { actualLocation: unknown; locationValue: string | null }): string {
  const actual = listing.actualLocation as Record<string, unknown> | null;
  return typeof actual?.display_name === "string"
    ? actual.display_name
    : listing.locationValue || "Studio Address";
}

/** Undecryptable details count as absent, matching how invoicing treats them. */
function decryptOwnerPayment(paymentDetails: unknown) {
  if (!paymentDetails) return null;
  try {
    return decryptPaymentDetailsInternal(paymentDetails as PaymentDetails);
  } catch {
    return null;
  }
}

/**
 * Labels for the studio dropdown. Deliberately scalar-only: no sets, no packages, no host
 * payment details. Loading the full option for every studio meant three PBKDF2 key
 * derivations per listing (see `encryptionService`) before the dialog could be used at all,
 * for data belonging to studios the admin was never going to pick.
 *
 * Every non-archived studio is listed, including unverified ones — an admin may well be
 * recording a booking for a space that is not live yet. The dialog shows the selected
 * studio's verification and bank state so that is a visible, deliberate choice.
 */
export async function getAdminStudiosForOfflineBooking(): Promise<AdminStudioSummary[]> {
  try {
    const listings = await prisma.listing.findMany({
      where: NOT_ARCHIVED,
      select: {
        id: true,
        title: true,
        locationValue: true,
        actualLocation: true,
        user: { select: { name: true } },
      },
      orderBy: { title: "asc" },
    });

    return listings.map((l) => ({
      id: l.id,
      title: l.title,
      hostName: l.user?.name || "Host",
      address: studioAddress(l),
    }));
  } catch (error) {
    console.error("[getAdminStudiosForOfflineBooking] Error retrieving studios:", error);
    return [];
  }
}

/**
 * The full option for the one studio an admin picked — sets, packages, host contact and
 * the decrypted bank/GSTIN details used to pre-fill the booking.
 */
export async function getAdminStudioForOfflineBooking(
  listingId: string
): Promise<AdminStudioOption | null> {
  const l = await prisma.listing.findFirst({
    where: { id: listingId, ...NOT_ARCHIVED },
    select: {
      id: true,
      title: true,
      locationValue: true,
      actualLocation: true,
      propertyStateCode: true,
      price: true,
      hasSets: true,
      setsHaveSamePrice: true,
      unifiedSetPrice: true,
      additionalSetPricingType: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          is_verified: true,
          bank_verified: true,
          bank_verified_name: true,
          // Each encrypted field costs its own PBKDF2 key derivation to read, so only
          // the three this dialog actually displays are loaded.
          paymentDetails: {
            select: {
              companyName: true,
              accountNumber: true,
              accountNumberIV: true,
              ifscCode: true,
              ifscCodeIV: true,
              gstin: true,
              gstinIV: true,
            },
          },
        },
      },
      sets: {
        select: { id: true, name: true, price: true, position: true },
        orderBy: { position: "asc" },
      },
      packages: {
        where: { isActive: true },
        select: {
          id: true,
          title: true,
          durationHours: true,
          offeredPrice: true,
          originalPrice: true,
          eligibleSetIds: true,
          requiredSetCount: true,
          fixedAddOn: true,
        },
      },
    },
  });

  if (!l) return null;

  const payment = decryptOwnerPayment(l.user?.paymentDetails);
  const decryptedGstin = payment?.gstin || "";
  const bankIfsc = payment?.ifscCode || "";
  const bankAccountLast4 = payment?.accountNumber ? payment.accountNumber.slice(-4) : "";

  return {
    id: l.id,
    title: l.title,
    hostId: l.user?.id || "",
    hostName: l.user?.name || "Host",
    hostEmail: l.user?.email || "",
    hostPhone: l.user?.phone || "",
    hostIsVerified: Boolean(l.user?.is_verified),
    hostBankVerified: Boolean(l.user?.bank_verified),
    hostBankVerifiedName: l.user?.bank_verified_name || undefined,
    bankAccountLast4: bankAccountLast4 || undefined,
    bankIfsc: bankIfsc || undefined,
    address: studioAddress(l),
    propertyStateCode: l.propertyStateCode || "07",
    price: l.price || 0,
    gstin: decryptedGstin,
    gstOwner: gstOwnerFor(payment),
    hasSets: Boolean(l.hasSets),
    setsHaveSamePrice: Boolean(l.setsHaveSamePrice),
    unifiedSetPrice: l.unifiedSetPrice ?? null,
    additionalSetPricingType: (l.additionalSetPricingType as "FIXED" | "HOURLY" | null) || null,
    sets: (l.sets || []).map((s) => ({
      id: s.id,
      name: s.name,
      price: s.price,
      position: s.position,
    })),
    packages: (l.packages || []).map((pkg) => ({
      id: pkg.id,
      title: pkg.title,
      durationHours: pkg.durationHours,
      offeredPrice: pkg.offeredPrice,
      originalPrice: pkg.originalPrice,
      eligibleSetIds: pkg.eligibleSetIds,
      requiredSetCount: pkg.requiredSetCount,
      fixedAddOn: pkg.fixedAddOn,
    })),
  };
}

function buildSlotRows(params: {
  listingId: string;
  reservationId: string;
  startDate: Date;
  startTime: string;
  endTime: string;
  setIds: string[];
}) {
  const start = parseTimeToMinutes(params.startTime);
  const end = asEndOfDayMinutes(parseTimeToMinutes(params.endTime));
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return [];
  }

  const dateKey = params.startDate.toISOString().slice(0, 10);
  // An offline booking takes the whole studio, so every set it owns is blocked.
  // Writing only the listing-wide row would leave a set-based studio bookable
  // online for the same slot.
  const slotSetIds = params.setIds.length > 0
    ? Array.from(new Set(params.setIds))
    : [LISTING_WIDE_SLOT_ID];
  const rows: Prisma.ReservationSlotCreateManyInput[] = [];

  for (let cursor = start; cursor < end; cursor += 30) {
    const hour = String(Math.floor(cursor / 60)).padStart(2, "0");
    const minute = String(cursor % 60).padStart(2, "0");
    const slotKey = `${hour}:${minute}`;

    for (const setId of slotSetIds) {
      rows.push({
        listingId: params.listingId,
        reservationId: params.reservationId,
        dateKey,
        slotKey,
        setId,
      });
    }
  }

  return rows;
}

/**
 * Creates an offline booking record end-to-end:
 * 1. Resolves/creates customer User and optional customer BillingDetails (GST)
 * 2. Resolves studio Listing and ensures propertyStateCode is compliant
 * 3. Generates unique booking ID and Reservation record (CONFIRMED)
 * 4. Creates calendar slot blocks (skipping already reserved slots)
 * 5. Creates Transaction record (SUCCESS)
 * 6. Generates customer tax invoice and dispatches it via email
 * 7. Dispatches WhatsApp confirmation to customer (no host message needed)
 * 8. Triggers Google Calendar sync
 */
export async function createOfflineBooking(
  data: CreateAdminOfflineBookingInput,
  adminUser: SafeUser
): Promise<OfflineBookingCreationResult> {
  // 1. Resolve Studio Listing from Platform
  const listing = await prisma.listing.findUnique({
    where: { id: data.listingId },
    include: { user: { select: { paymentDetails: { select: { companyName: true, gstin: true, gstinIV: true } } } } },
  });

  if (!listing) {
    throw new UserFacingError("Selected studio was not found on the platform. Please select a valid studio.");
  }

  const gstOwnedBy = gstOwnerFor(decryptOwnerPayment(listing.user?.paymentDetails));

  const actualLoc = listing.actualLocation as Record<string, unknown> | null;
  const studioAddress = typeof actualLoc?.display_name === "string"
    ? actualLoc.display_name
    : listing.locationValue || "Studio Address";

  // Ensure listing has a valid propertyStateCode for invoice generation
  let effectiveStateCode = listing.propertyStateCode;
  if (!isValidGstStateCode(effectiveStateCode)) {
    if (data.propertyStateCode && isValidGstStateCode(data.propertyStateCode)) {
      effectiveStateCode = data.propertyStateCode;
    } else if (data.studioGst && isValidGstStateCode(data.studioGst.slice(0, 2))) {
      effectiveStateCode = data.studioGst.slice(0, 2);
    } else {
      const stateFromName = getGstStateCodeFromStateName(listing.locationValue);
      effectiveStateCode = stateFromName && isValidGstStateCode(stateFromName) ? stateFromName : "07";
    }

    await prisma.listing.update({
      where: { id: listing.id },
      data: { propertyStateCode: effectiveStateCode },
    });
    listing.propertyStateCode = effectiveStateCode;
  }

  // 2. Resolve Customer User
  const customerEmail = data.customerEmail.toLowerCase().trim();
  let customer = await prisma.user.findUnique({
    where: { email: customerEmail },
  });

  if (!customer) {
    customer = await prisma.user.create({
      data: {
        email: customerEmail,
        name: data.customerName.trim(),
        phone: data.customerPhone.trim(),
        role: UserRole.CUSTOMER,
        phone_verified: true,
        email_verified: true,
      },
    });
  } else {
    // Update name or phone if missing
    const updates: Prisma.UserUpdateInput = {};
    if (!customer.name && data.customerName.trim()) updates.name = data.customerName.trim();
    if (!customer.phone && data.customerPhone.trim()) updates.phone = data.customerPhone.trim();
    if (Object.keys(updates).length > 0) {
      customer = await prisma.user.update({
        where: { id: customer.id },
        data: updates,
      });
    }
  }

  // 3. Customer GST / Billing Details
  let billingDetailId: string | undefined;
  let billingSnapshot: Record<string, string> | undefined;

  if (data.customerGst) {
    const normalizedGstin = data.customerGst.toUpperCase().trim();
    const companyName = data.customerCompanyName?.trim() || data.customerName.trim();
    const billingAddress = data.customerBillingAddress?.trim() || studioAddress;

    let billing = await prisma.billingDetails.findFirst({
      where: {
        userId: customer.id,
        gstin: normalizedGstin,
      },
    });

    if (!billing) {
      billing = await prisma.billingDetails.create({
        data: {
          userId: customer.id,
          companyName,
          gstin: normalizedGstin,
          billingAddress,
          isDefault: true,
        },
      });
    }

    billingDetailId = billing.id;
    billingSnapshot = {
      id: billing.id,
      companyName,
      gstin: normalizedGstin,
      billingAddress,
    };
  }

  // 4. Generate unique Booking ID & create Reservation
  const bookingId = generateBookingId();
  const startDate = new Date(`${data.bookingDate}T00:00:00.000Z`);
  const studioSets = await prisma.listingSet.findMany({
    where: { listingId: listing.id },
    select: { id: true, name: true, price: true, position: true },
    orderBy: { position: "asc" },
  });

  const selectedSetIds = Array.isArray(data.setIds) && data.setIds.length > 0
    ? data.setIds
    : studioSets.map((s) => s.id);

  let includedSetId: string | null = null;
  if (selectedSetIds.length > 0 && studioSets.length > 0) {
    const matchedSets = studioSets
      .filter((s) => selectedSetIds.includes(s.id))
      .sort((a, b) => (a.price !== b.price ? a.price - b.price : a.position - b.position));
    includedSetId = matchedSets[0]?.id || null;
  }

  // The agreed price is pre-GST, like listed studio rates; GST goes on top exactly as at online checkout.
  const { total: totalWithGst } = addGst(data.price);

  const reservationData: Prisma.ReservationUncheckedCreateInput = {
    bookingId,
    userId: customer.id,
    listingId: listing.id,
    startDate,
    startTime: data.startTime,
    endTime: data.endTime,
    totalPrice: totalWithGst,
    totalPriceInt: Math.round(totalWithGst),
    status: "CONFIRMED",
    billingDetailId,
    billingSnapshot: billingSnapshot || undefined,
    setIds: selectedSetIds,
    includedSetId: includedSetId || undefined,
    setPackageId: data.packageId || undefined,
    pricingSnapshot: {
      offlineBooking: true,
      bookingType: data.bookingType,
      packageId: data.packageId || undefined,
      packageName: data.packageName || undefined,
      setIds: selectedSetIds,
      setNames: studioSets.filter((s) => selectedSetIds.includes(s.id)).map((s) => s.name),
      hoursBooked: data.hoursBooked,
      price: data.price,
      paymentMadeVia: data.paymentMadeVia,
      paymentTerms: data.paymentTerms,
      internalNotes: data.internalNotes || undefined,
      createdOfflineBy: adminUser.email || adminUser.name || "Admin",
      createdOfflineAt: new Date().toISOString(),
    },
  };

  // 5-6. Reservation, calendar slots and the payment record are one atomic
  // write: a partial failure would otherwise leave a confirmed booking with no
  // transaction, or blocked slots with no reservation.
  const { reservation, transaction } = await prisma.$transaction(async (tx) => {
      const createdReservation = await tx.reservation.create({ data: reservationData });

      const slots = buildSlotRows({
        listingId: listing.id,
        reservationId: createdReservation.id,
        startDate,
        startTime: data.startTime,
        endTime: data.endTime,
        setIds: selectedSetIds.length > 0 ? selectedSetIds : studioSets.map((s) => s.id),
      });

      // Every slot is inserted rather than skipping taken ones, so the unique
      // index rejects the booking instead of silently double-booking the studio.
      if (slots.length > 0) {
        await tx.reservationSlot.createMany({ data: slots });
      }

      const createdTransaction = await tx.transaction.create({
        data: {
          userId: customer.id,
          listingId: listing.id,
          reservationId: createdReservation.id,
          bookingId,
          amount: totalWithGst,
          currency: "INR",
          status: "SUCCESS",
          purpose: "BASE_BOOKING",
          paymentMethod: data.paymentMadeVia,
          customerEmail: data.customerEmail,
          customerPhone: data.customerPhone,
          description: `Offline Booking - ${data.paymentMadeVia} (${data.paymentTerms})`,
          payoutDoneAt: new Date(),
          payoutSplitAt: new Date(),
          payoutAmountToOwner: 0,
          payoutPercentToOwner: 0,
          gstOwnedBy,
          metadata: {
            offline: true,
            bookingType: data.bookingType,
            packageName: data.packageName,
            hoursBooked: data.hoursBooked,
            paymentMadeVia: data.paymentMadeVia,
            paymentTerms: data.paymentTerms,
            internalNotes: data.internalNotes,
          },
        },
      });

      return { reservation: createdReservation, transaction: createdTransaction };
    }, { maxWait: 10_000, timeout: 30_000 })
    .catch((error) => {
      if (isReservationSlotUniqueConflict(error)) {
        throw new UserFacingError(
          "That studio is already booked for part of the selected time. Pick another slot.",
          409
        );
      }
      throw error;
    });

  // 7. Trigger standard booking confirmation side effects (Invoice generation, Customer email with PDF, Host email, WhatsApp notifications, Calendar sync)
  let invoiceNumber: string | undefined;
  let emailSent = false;
  let whatsappSent = false;

  try {
    await ReservationService.ensurePostReservationSideEffects(transaction.id);

    // Read generated invoice
    const inv = await prisma.invoice.findFirst({
      where: { transactionId: transaction.id },
      select: { invoiceNumber: true, emailSentAt: true, status: true },
      orderBy: { createdAt: "desc" },
    });
    if (inv) {
      invoiceNumber = inv.invoiceNumber;
      emailSent = Boolean(inv.emailSentAt || inv.status === "EMAIL_SENT");
    }

    const updatedTxn = await prisma.transaction.findUnique({
      where: { id: transaction.id },
      select: { whatsappSentCustomer: true },
    });
    whatsappSent = Boolean(updatedTxn?.whatsappSentCustomer);
  } catch (sideEffectErr) {
    console.error("[OfflineBooking] Post-reservation side effects failed:", sideEffectErr);
  }

  return {
    bookingId,
    reservationId: reservation.id,
    invoiceNumber,
    emailSent,
    whatsappSent,
  };
}
