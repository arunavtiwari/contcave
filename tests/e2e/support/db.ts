import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

import { getE2EConnectionEnv } from "./env";
import { readRunState, trackCreated } from "./run-state";

const env = getE2EConnectionEnv();
process.env.DATABASE_URL = env.databaseUrl;

export const prisma = new PrismaClient();

export type QAAccount = {
  email: string;
  password: string;
  name: string;
  phone: string;
};

export function qaAccount(role: "owner" | "customer", suffix = ""): QAAccount {
  const state = readRunState();
  const safeSuffix = suffix ? `-${suffix}` : "";
  const localPart = `${state.runId}-${role}${safeSuffix}`.replace(/[^a-zA-Z0-9._-]/g, "-");
  const digitSeed = `${Date.now()}`.slice(-8);
  const displaySeed = state.runId.replace(/^qa-e2e-/, "").slice(-6);

  return {
    email: `${localPart}@${env.emailDomain}`,
    password: "QaPass12345",
    name: `QA ${role} ${displaySeed}`,
    phone: `9${role === "owner" ? "8" : "7"}${digitSeed}`.slice(0, 10),
  };
}

export async function trackUserByEmail(email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  trackCreated("user", user?.id);
  return user;
}

export async function waitForUserByEmail(email: string, timeoutMs = 30_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      trackCreated("user", user.id);
      return user;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for QA user ${email}`);
}

export async function waitForListingByTitle(title: string, timeoutMs = 60_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const listing = await prisma.listing.findFirst({ where: { title } });
    if (listing) {
      trackCreated("listing", listing.id);
      return listing;
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error(`Timed out waiting for QA listing ${title}`);
}

export async function waitForReservation(params: {
  userId: string;
  listingId: string;
  timeoutMs?: number;
}) {
  const startedAt = Date.now();
  const timeoutMs = params.timeoutMs ?? 180_000;

  while (Date.now() - startedAt < timeoutMs) {
    const reservation = await prisma.reservation.findFirst({
      where: {
        userId: params.userId,
        listingId: params.listingId,
        markedForDeletion: false,
      },
      orderBy: { createdAt: "desc" },
      include: { Transaction: { orderBy: { createdAt: "desc" } } },
    });

    if (reservation) {
      trackCreated("reservation", reservation.id);
      reservation.Transaction.forEach((txn) => trackCreated("transaction", txn.id));
      return reservation;
    }

    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }

  const transactions = await prisma.transaction.findMany({
    where: {
      userId: params.userId,
      listingId: params.listingId,
    },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      status: true,
      amount: true,
      cfOrderId: true,
      cfTxnRef: true,
      reservationId: true,
      bookingId: true,
      description: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  transactions.forEach((txn) => trackCreated("transaction", txn.id));

  throw new Error(
    `Timed out waiting for reservation for listing ${params.listingId}. Latest transactions: ${JSON.stringify(
      transactions,
      null,
      2
    )}`
  );
}

export async function createUserFixture(params: {
  role: "OWNER" | "CUSTOMER";
  verified?: boolean;
  suffix: string;
}) {
  const account = qaAccount(params.role === "OWNER" ? "owner" : "customer", params.suffix);
  const hashedPassword = await bcrypt.hash(account.password, 12);

  const user = await prisma.user.create({
    data: {
      email: account.email,
      name: account.name,
      phone: account.phone,
      hashedPassword,
      role: params.role,
      ...(params.verified
        ? {
            email_verified: true,
            phone_verified: true,
            aadhaar_verified: true,
            bank_verified: true,
            is_verified: true,
            verification_stage: 3,
            verified_at: new Date(),
            bank_verified_name: account.name,
            aadhaar_last4: "1234",
            verified_via: ["e2e_fixture"],
          }
        : {}),
    },
  });

  trackCreated("user", user.id);
  return { account, user };
}

export async function createActiveListingFixture(ownerId: string, suffix: string) {
  const state = readRunState();
  const title = `${state.runId} Active Studio ${suffix}`;
  const listing = await prisma.listing.create({
    data: {
      slug: `${state.runId}-active-studio-${suffix}`.toLowerCase(),
      title,
      description:
        "<p>QA active studio for guarded staging booking tests. This listing is created by automation and should be removed after the run.</p>",
      imageSrc: ["https://assets.contcave.com/e2e/placeholder-studio.png"],
      category: "Indoor Studio",
      locationValue: "Delhi",
      actualLocation: {
        latlng: [28.62868, 77.21905],
        label: "Delhi",
        value: "Delhi",
        display_name: "Connaught Place, New Delhi, Delhi, India",
        state: "Delhi",
      },
      locationPoint: {
        type: "Point",
        coordinates: [77.21905, 28.62868],
      },
      price: 1500,
      userId: ownerId,
      amenities: [],
      otherAmenities: ["QA lighting"],
      addons: [{ name: "QA Smoke Machine", price: 250, qty: 1 }],
      carpetArea: 1200,
      operationalDays: { start: "Mon", end: "Sun" },
      operationalHours: { start: "9:00 AM", end: "9:00 PM" },
      minimumBookingHours: 2,
      maximumPax: 12,
      instantBooking: true,
      type: ["Fashion Shoot"],
      verifications: { documents: [{ original_filename: "fixture.pdf", bytes: 128, url: "https://assets.contcave.com/e2e/fixture.pdf" }] },
      terms: true,
      status: "VERIFIED",
      active: true,
      hasSets: false,
      setsHaveSamePrice: false,
      customTerms: "<p>QA fixture terms.</p>",
    },
  });

  trackCreated("listing", listing.id);
  return listing;
}

export async function createAdminUserFixture(suffix: string) {
  const account = qaAccount("owner", `admin-${suffix}`);
  const hashedPassword = await bcrypt.hash(account.password, 12);

  const user = await prisma.user.create({
    data: {
      email: account.email,
      name: account.name,
      phone: account.phone,
      hashedPassword,
      role: "ADMIN",
      email_verified: true,
      phone_verified: true,
      aadhaar_verified: true,
      bank_verified: true,
      is_verified: true,
      verification_stage: 3,
      verified_at: new Date(),
      bank_verified_name: account.name,
      aadhaar_last4: "4321",
      aadhaar_ref_id: `aadhaar-ref-${suffix}`,
      verified_via: ["e2e_admin_fixture"],
    },
  });

  trackCreated("user", user.id);
  return { account, user };
}

export async function createReviewListingFixture(params: {
  ownerId: string;
  suffix: string;
  status?: "PENDING" | "VERIFIED" | "REJECTED";
}) {
  const state = readRunState();
  const status = params.status ?? "PENDING";
  const title = `${state.runId} Review Studio ${params.suffix}`;
  const paymentDetails = await prisma.paymentDetails.upsert({
    where: { userId: params.ownerId },
    update: {},
    create: {
      userId: params.ownerId,
      accountHolderName: "QA Verified Host",
      bankName: "QA Bank",
      accountNumber: "123456789012",
      ifscCode: "HDFC0001234",
      companyName: "QA Studios LLP",
      gstin: "29ABCDE1234F1Z5",
      cashfreeVendorId: `qa_vendor_${params.suffix}`,
    },
  });
  trackCreated("paymentDetails", paymentDetails.id);

  const listing = await prisma.listing.create({
    data: {
      slug: `${state.runId}-review-studio-${params.suffix}`.toLowerCase(),
      title,
      description:
        "<p>QA review studio with complete moderation details, verification documents, agreement PDF, amenities, add-ons, and package data.</p>",
      imageSrc: ["https://assets.contcave.com/e2e/placeholder-studio.png"],
      videoSrc: "https://assets.contcave.com/e2e/video-tour.mp4",
      category: "Indoor Studio",
      locationValue: "Delhi",
      actualLocation: {
        latlng: [28.62868, 77.21905],
        label: "Delhi",
        display_name: "Connaught Place, New Delhi, Delhi, India",
      },
      locationPoint: {
        type: "Point",
        coordinates: [77.21905, 28.62868],
      },
      price: 2200,
      userId: params.ownerId,
      amenities: ["WiFi", "Changing Room"],
      otherAmenities: ["QA cyclorama"],
      addons: [{ name: "Continuous LED Light", price: 250, qty: 2 }],
      carpetArea: 1400,
      operationalDays: { start: "Mon", end: "Sat" },
      operationalHours: { start: "9:00 AM", end: "9:00 PM" },
      minimumBookingHours: 2,
      maximumPax: 10,
      instantBooking: false,
      type: ["Fashion Shoot", "Product Shoot"],
      verifications: {
        documents: [
          {
            original_filename: "ownership-proof.pdf",
            bytes: 2048,
            format: "pdf",
            url: "https://assets.contcave.com/e2e/ownership-proof.pdf",
          },
        ],
        agreementPdf: {
          url: "https://assets.contcave.com/e2e/agreement.pdf",
          pdfUrl: "https://assets.contcave.com/e2e/agreement.pdf",
          public_id: "agreement-fixture",
        },
      },
      terms: true,
      status,
      active: status === "VERIFIED",
      hasSets: true,
      setsHaveSamePrice: false,
      customTerms: "<p>QA custom moderation terms.</p>",
    },
  });

  await prisma.listingSet.create({
    data: {
      listingId: listing.id,
      name: "Main Set",
      description: "Fixture set",
      images: ["https://assets.contcave.com/e2e/set.png"],
      price: 500,
      position: 0,
    },
  });

  await prisma.package.create({
    data: {
      listingId: listing.id,
      title: "QA Review Package",
      description: "Moderation package",
      originalPrice: 4500,
      offeredPrice: 3900,
      features: ["Two hour shoot", "Basic lighting"],
      durationHours: 2,
      eligibleSetIds: [],
      isActive: true,
    },
  });

  trackCreated("listing", listing.id);
  return listing;
}

export async function promoteListingForBooking(listingId: string) {
  const listing = await prisma.listing.update({
    where: { id: listingId },
    data: {
      status: "VERIFIED",
      active: true,
      instantBooking: true,
    },
  });
  trackCreated("listing", listing.id);
  return listing;
}

export async function assertOwnerFullyVerified(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { paymentDetails: true },
  });

  if (!user) throw new Error(`User not found: ${userId}`);
  if (!user.email_verified) throw new Error("Expected email_verified=true");
  if (!user.phone_verified) throw new Error("Expected phone_verified=true");
  if (!user.aadhaar_verified) throw new Error("Expected aadhaar_verified=true");
  if (!user.bank_verified) throw new Error("Expected bank_verified=true");
  if (!user.is_verified) throw new Error("Expected is_verified=true");
  if (user.verification_stage !== 3) throw new Error(`Expected verification_stage=3, got ${user.verification_stage}`);
  if (!user.paymentDetails) throw new Error("Expected encrypted paymentDetails to exist");

  trackCreated("paymentDetails", user.paymentDetails.id);
  return user;
}
