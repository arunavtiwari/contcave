import { DeleteObjectsCommand } from "@aws-sdk/client-s3";

import { r2 } from "../../../lib/storage/r2";
import { prisma } from "./db";
import { getE2EEnv } from "./env";
import { RunState } from "./run-state";

function unique(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => !!value)));
}

function jsonUrls(value: unknown): string[] {
  if (!value) return [];
  if (typeof value === "string") return value.startsWith("http") ? [value] : [];
  if (Array.isArray(value)) return value.flatMap(jsonUrls);
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).flatMap(jsonUrls);
  }
  return [];
}

function keyFromPublicUrl(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    if (!url.pathname || url.pathname === "/") return null;
    return decodeURIComponent(url.pathname.replace(/^\/+/, ""));
  } catch {
    return null;
  }
}

async function deleteR2Keys(keys: string[]) {
  const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME;
  const filtered = unique(keys).filter((key) => key.startsWith("users/"));

  if (!bucket || filtered.length === 0) return;

  for (let i = 0; i < filtered.length; i += 1000) {
    const chunk = filtered.slice(i, i + 1000);
    await r2.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: {
          Objects: chunk.map((Key) => ({ Key })),
          Quiet: true,
        },
      })
    );
  }
}

export async function cleanupE2ERun(state: RunState) {
  const env = getE2EEnv();
  const runId = state.runId;

  if (!runId.startsWith("qa-e2e-")) {
    throw new Error(`Refusing cleanup for non-QA run id: ${runId}`);
  }

  const trackedUserIds = state.created.user || [];
  const trackedListingIds = state.created.listing || [];

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { id: { in: trackedUserIds } },
        { email: { contains: runId } },
        { name: { contains: runId } },
      ],
    },
    select: { id: true },
  });
  const userIds = unique([...trackedUserIds, ...users.map((user) => user.id)]);

  const listings = await prisma.listing.findMany({
    where: {
      OR: [
        { id: { in: trackedListingIds } },
        { userId: { in: userIds } },
        { title: { contains: runId } },
        { slug: { contains: runId.toLowerCase() } },
      ],
    },
  });
  const listingIds = unique([...trackedListingIds, ...listings.map((listing) => listing.id)]);

  const reservations = await prisma.reservation.findMany({
    where: {
      OR: [
        { id: { in: state.created.reservation || [] } },
        { userId: { in: userIds } },
        { listingId: { in: listingIds } },
      ],
    },
    select: { id: true },
  });
  const reservationIds = unique([...state.created.reservation, ...reservations.map((reservation) => reservation.id)]);

  const transactions = await prisma.transaction.findMany({
    where: {
      OR: [
        { id: { in: state.created.transaction || [] } },
        { userId: { in: userIds } },
        { listingId: { in: listingIds } },
        { reservationId: { in: reservationIds } },
      ],
    },
    select: { id: true },
  });
  const transactionIds = unique([...state.created.transaction, ...transactions.map((transaction) => transaction.id)]);

  const invoices = await prisma.invoice.findMany({
    where: {
      OR: [
        { id: { in: state.created.invoice || [] } },
        { userId: { in: userIds } },
        { reservationId: { in: reservationIds } },
        { transactionId: { in: transactionIds } },
      ],
    },
    select: { id: true, invoiceUrl: true },
  });
  const invoiceIds = unique([...state.created.invoice, ...invoices.map((invoice) => invoice.id)]);

  const r2Keys = [
    ...state.created.r2Key,
    ...listings.flatMap((listing) => [
      ...listing.imageSrc,
      listing.videoSrc,
      ...jsonUrls(listing.verifications),
    ]),
    ...invoices.map((invoice) => invoice.invoiceUrl),
  ]
    .flatMap((url) => (url ? [url] : []))
    .map(keyFromPublicUrl)
    .filter((key): key is string => !!key);

  await prisma.invoice.deleteMany({ where: { id: { in: invoiceIds } } });
  await prisma.review.deleteMany({
    where: {
      OR: [
        { userId: { in: userIds } },
        { listingId: { in: listingIds } },
        { reservationId: { in: reservationIds } },
      ],
    },
  });
  await prisma.transaction.deleteMany({ where: { id: { in: transactionIds } } });
  await prisma.reservation.deleteMany({ where: { id: { in: reservationIds } } });
  await prisma.billingDetails.deleteMany({
    where: {
      OR: [{ id: { in: state.created.billingDetails || [] } }, { userId: { in: userIds } }],
    },
  });
  await prisma.paymentDetails.deleteMany({
    where: {
      OR: [{ id: { in: state.created.paymentDetails || [] } }, { userId: { in: userIds } }],
    },
  });
  await prisma.package.deleteMany({ where: { listingId: { in: listingIds } } });
  await prisma.listingSet.deleteMany({ where: { listingId: { in: listingIds } } });
  await prisma.listingBlock.deleteMany({ where: { listingId: { in: listingIds } } });
  await prisma.dayStatus.deleteMany({ where: { listingId: { in: listingIds } } });
  await prisma.customAmenities.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.account.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.listing.deleteMany({ where: { id: { in: listingIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await deleteR2Keys(r2Keys);
  await prisma.$disconnect();

  console.warn(
    `[e2e] Cleaned ${userIds.length} users, ${listingIds.length} listings, ${reservationIds.length} reservations for ${env.baseUrl}`
  );
}
