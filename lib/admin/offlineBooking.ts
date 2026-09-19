import "server-only";

import { PaymentDetails, Prisma } from "@prisma/client";

import { getGstStateCodeFromStateName, isValidGstStateCode } from "@/constants/gstStateCodes";
import { parseTimeToMinutes } from "@/lib/availability";
import { ensureCalendarEventForUser } from "@/lib/calendar/createEvent";
import { UserFacingError } from "@/lib/errors";
import { InvoiceService } from "@/lib/invoice/service";
import { decryptPaymentDetailsInternal } from "@/lib/payment-details";
import prisma from "@/lib/prismadb";
import { isReservationSlotUniqueConflict, LISTING_WIDE_SLOT_ID } from "@/lib/reservation/slots";
import { formatReservationDate, parseReservationEndTimeForDate, parseReservationTimeForDate } from "@/lib/reservation/time";
import { asEndOfDayMinutes } from "@/lib/scheduling";
import { generateBookingId } from "@/lib/utils";
import { WhatsappService } from "@/lib/whatsapp/service";
import { CreateAdminOfflineBookingInput } from "@/schemas/offlineBooking";
import { SafeUser, UserRole } from "@/types/user";

export interface AdminStudioOption {
  id: string;
  title: string;
  hostName: string;
  hostEmail: string;
  hostPhone: string;
  address: string;
  propertyStateCode: string;
  price: number;
  gstin: string;
  packages: Array<{
    id: string;
    title: string;
    durationHours: number;
    offeredPrice: number;
  }>;
}

export interface OfflineBookingCreationResult {
  bookingId: string;
  reservationId: string;
  invoiceNumber?: string;
  emailSent: boolean;
  whatsappSent: boolean;
}

/**
 * Retrieve active and verified studio listings to populate the offline booking selector.
 */
export async function getAdminStudiosForOfflineBooking(): Promise<AdminStudioOption[]> {
  const listings = await prisma.listing.findMany({
    where: {
      archivedAt: null,
    },
    select: {
      id: true,
      title: true,
      locationValue: true,
      actualLocation: true,
      propertyStateCode: true,
      price: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          paymentDetails: true,
        },
      },
      packages: {
        where: { isActive: true },
        select: {
          id: true,
          title: true,
          durationHours: true,
          offeredPrice: true,
        },
      },
    },
    orderBy: { title: "asc" },
  });

  return listings.map((l) => {
    let decryptedGstin = "";
    if (l.user.paymentDetails) {
      try {
        const decrypted = decryptPaymentDetailsInternal(l.user.paymentDetails as PaymentDetails);
        decryptedGstin = decrypted?.gstin || "";
      } catch {
        decryptedGstin = "";
      }
    }

    const actual = l.actualLocation as Record<string, unknown> | null;
    const address = typeof actual?.display_name === "string"
      ? actual.display_name
      : l.locationValue;

    return {
      id: l.id,
      title: l.title,
      hostName: l.user.name || "",
      hostEmail: l.user.email || "",
      hostPhone: l.user.phone || "",
      address,
      propertyStateCode: l.propertyStateCode || "",
      price: l.price || 0,
      gstin: decryptedGstin,
      packages: l.packages.map((pkg) => ({
        id: pkg.id,
        title: pkg.title,
        durationHours: pkg.durationHours,
        offeredPrice: pkg.offeredPrice,
      })),
    };
  });
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
  // 1. Resolve Customer User
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

  // 2. Customer GST / Billing Details
  let billingDetailId: string | undefined;
  let billingSnapshot: Record<string, string> | undefined;

  if (data.customerGst) {
    const normalizedGstin = data.customerGst.toUpperCase().trim();
    const companyName = data.customerCompanyName?.trim() || data.customerName.trim();
    const billingAddress = data.customerBillingAddress?.trim() || data.studioAddress.trim();

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

  // 3. Resolve Studio Listing
  let listing = data.listingId
    ? await prisma.listing.findUnique({
        where: { id: data.listingId },
        include: { user: { include: { paymentDetails: true } } },
      })
    : null;

  if (!listing) {
    // Matching on title alone can attach the booking to another host's studio,
    // so the studio contact email has to agree and the order must be stable.
    listing = await prisma.listing.findFirst({
      where: {
        title: data.studioName.trim(),
        archivedAt: null,
        user: { is: { email: data.studioEmail.toLowerCase().trim() } },
      },
      include: { user: { include: { paymentDetails: true } } },
      orderBy: { createdAt: "asc" },
    });
  }

  if (!listing) {
    // Create an offline studio entry if not present
    const hostEmail = data.studioEmail.toLowerCase().trim();
    let host = await prisma.user.findUnique({
      where: { email: hostEmail },
    });

    if (!host) {
      host = await prisma.user.create({
        data: {
          email: hostEmail,
          name: data.studioName.trim(),
          role: UserRole.OWNER,
          email_verified: true,
        },
      });
    }

    const stateCode = data.propertyStateCode
      || (data.studioGst ? data.studioGst.slice(0, 2) : "07");

    // Kept unpublished on purpose: this record exists so the booking, invoice
    // and payout have a studio to hang off, not to appear in public search with
    // no photos. An admin can review and publish it later.
    listing = await prisma.listing.create({
      data: {
        userId: host.id,
        title: data.studioName.trim(),
        description: `Offline studio listing for ${data.studioName.trim()}`,
        category: "Studio",
        locationValue: data.studioAddress.trim(),
        propertyStateCode: stateCode,
        price: Math.max(1, Math.round(data.price / Math.max(data.hoursBooked, 1))),
        status: "PENDING",
        active: false,
      },
      include: { user: { include: { paymentDetails: true } } },
    });
  } else {
    // Ensure existing listing has a valid propertyStateCode for invoice generation
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
  }

  // 4. Generate unique Booking ID & create Reservation
  const bookingId = generateBookingId();
  const startDate = new Date(`${data.bookingDate}T00:00:00.000Z`);
  const studioSetIds = await prisma.listingSet.findMany({
    where: { listingId: listing.id },
    select: { id: true },
  });

  const reservationData: Prisma.ReservationUncheckedCreateInput = {
    bookingId,
    userId: customer.id,
    listingId: listing.id,
    startDate,
    startTime: data.startTime,
    endTime: data.endTime,
    totalPrice: data.price,
    totalPriceInt: Math.round(data.price),
    status: "CONFIRMED",
    billingDetailId,
    billingSnapshot: billingSnapshot || undefined,
    pricingSnapshot: {
      offlineBooking: true,
      bookingType: data.bookingType,
      packageId: data.packageId || undefined,
      packageName: data.packageName || undefined,
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
        setIds: studioSetIds.map((set) => set.id),
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
          amount: data.price,
          currency: "INR",
          status: "SUCCESS",
          purpose: "BASE_BOOKING",
          paymentMethod: data.paymentMadeVia,
          customerEmail: data.customerEmail,
          customerPhone: data.customerPhone,
          description: `Offline Booking - ${data.paymentMadeVia} (${data.paymentTerms})`,
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

  // 7. Generate customer tax invoice and send email with invoice attachment
  let invoiceNumber: string | undefined;
  let emailSent = false;
  try {
    const { invoice } = await InvoiceService.ensureCustomerInvoiceForTransaction(transaction.id);
    invoiceNumber = invoice.invoiceNumber;
    try {
      await InvoiceService.sendCustomerBookingConfirmationWithInvoice(invoice.id);
      emailSent = true;
    } catch (emailErr) {
      console.error("[OfflineBooking] Customer invoice email delivery failed:", emailErr);
    }
  } catch (invoiceErr) {
    console.error("[OfflineBooking] Customer invoice generation failed:", invoiceErr);
  }

  // 8. Send WhatsApp confirmation to customer (no host message needed)
  let whatsappSent = false;
  if (data.customerPhone) {
    try {
      const formattedDate = formatReservationDate(startDate);
      const actualLoc = listing.actualLocation as Record<string, unknown> | null;
      const locationLink = typeof actualLoc?.url === "string"
        ? actualLoc.url
        : typeof actualLoc?.mapsUrl === "string"
          ? actualLoc.mapsUrl
          : typeof actualLoc?.googleMapsUrl === "string"
            ? actualLoc.googleMapsUrl
            : typeof actualLoc?.display_name === "string"
              ? actualLoc.display_name
              : data.studioAddress;

      await WhatsappService.sendBookingConfirmedCustomer(data.customerPhone, {
        customerName: data.customerName,
        listingTitle: data.studioName,
        startDate: formattedDate,
        startTime: `${data.startTime} to ${data.endTime}`,
        locationLink: String(locationLink || "https://contcave.com"),
        idempotencyKey: `confirm_offline_${reservation.id}`,
      });
      whatsappSent = true;
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { whatsappSentCustomer: true },
      });
    } catch (whatsappErr) {
      console.error("[OfflineBooking] Customer WhatsApp confirmation failed:", whatsappErr);
    }
  }

  // 9. Calendar side-effect for host
  const startAt = parseReservationTimeForDate(startDate, data.startTime);
  const endAt = parseReservationEndTimeForDate(startDate, data.endTime);
  if (startAt && endAt) {
    await ensureCalendarEventForUser({
      userId: listing.userId,
      title: `Booking: ${listing.title}`,
      startIso: startAt.toISOString(),
      endIso: endAt.toISOString(),
    }).catch(() => undefined);
  }

  return {
    bookingId,
    reservationId: reservation.id,
    invoiceNumber,
    emailSent,
    whatsappSent,
  };
}
