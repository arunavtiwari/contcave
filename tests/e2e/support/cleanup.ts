import { isE2eEffectDisabled } from "../../../lib/e2e-guards";
import { deleteStoredMedia } from "../../../lib/storage/mediaCleanup";
import { prisma } from "./db";
import { getE2EEnv } from "./env";
import { RunState } from "./run-state";

function unique(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => !!value)));
}

function jsonStrings(value: unknown): string[] {
  if (!value) return [];
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(jsonStrings);
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).flatMap(jsonStrings);
  }
  return [];
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
    select: { id: true, profileImage: true, image: true },
  });
  const userIds = unique([...trackedUserIds, ...users.map((user) => user.id)]);

  const listings = await prisma.listing.findMany({
    where: {
      OR: [
        { id: { in: trackedListingIds } },
        { userId: { in: userIds } },
        { title: { contains: runId } },
        { slug: { contains: runId.toLowerCase() } },
        // UI-created Rent Modal listings can be persisted before their ID is
        // returned to the test and therefore before run-state tracking. The
        // description is an explicit QA-only fixture marker for recovery.
        { description: { contains: "QA staging listing created by enterprise E2E validation" } },
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
    select: { id: true, invoiceUrl: true, idempotencyKey: true },
  });
  const invoiceIds = unique([...state.created.invoice, ...invoices.map((invoice) => invoice.id)]);
  const invoiceIdempotencyKeys = unique(invoices.map((invoice) => invoice.idempotencyKey));

  const vouchers = await prisma.paymentVoucher.findMany({
    where: {
      OR: [
        { id: { in: state.created.voucher || [] } },
        { userId: { in: userIds } },
        { reservationId: { in: reservationIds } },
        { transactionId: { in: transactionIds } },
      ],
    },
    select: { id: true, voucherUrl: true, idempotencyKey: true },
  });
  const voucherIds = unique([...(state.created.voucher || []), ...vouchers.map((voucher) => voucher.id)]);
  const voucherIdempotencyKeys = unique(vouchers.map((voucher) => voucher.idempotencyKey));

  const publicRefs = unique([
    ...state.created.r2Key,
    ...listings.flatMap((listing) => [
      ...listing.imageSrc,
      listing.videoSrc,
      ...jsonStrings(listing.verifications),
    ]),
    ...users.flatMap((user) => [user.profileImage, user.image]),
  ]);
  const privateRefs = unique([
    ...(state.created.r2PrivateRef || []),
    ...listings.flatMap((listing) => jsonStrings(listing.verifications)),
    ...invoices.map((invoice) => invoice.invoiceUrl),
    ...vouchers.map((voucher) => voucher.voucherUrl),
  ]);

  await prisma.paymentVoucher.deleteMany({ where: { id: { in: voucherIds } } });
  await prisma.paymentVoucherIdempotencyLock.deleteMany({
    where: {
      OR: [
        { id: { in: state.created.voucherLock || [] } },
        { idempotencyKey: { in: voucherIdempotencyKeys } },
      ],
    },
  });
  await prisma.paymentVoucherSequence.deleteMany({ where: { id: { in: state.created.voucherSequence || [] } } });
  await prisma.invoice.deleteMany({ where: { id: { in: invoiceIds } } });
  await prisma.invoiceIdempotencyLock.deleteMany({ where: { idempotencyKey: { in: invoiceIdempotencyKeys } } });
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
  await prisma.reservationSlot.deleteMany({ where: { reservationId: { in: reservationIds } } });
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
  // A delayed QStash delivery can create a voucher after the first collection
  // pass above. Remove user-owned documents again immediately before users.
  await prisma.paymentVoucher.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await deleteStoredMedia(publicRefs, userIds);
  if (!isE2eEffectDisabled("E2E_DISABLE_R2_UPLOAD")) {
    await deleteStoredMedia(privateRefs, userIds);
  }
  await prisma.$disconnect();

  console.warn(
    `[e2e] Cleaned ${userIds.length} users, ${listingIds.length} listings, ${reservationIds.length} reservations for ${env.baseUrl}`
  );
}
