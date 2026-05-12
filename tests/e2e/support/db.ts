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

  throw new Error(`Timed out waiting for reservation for listing ${params.listingId}`);
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
