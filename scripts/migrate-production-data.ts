/**
 * Idempotent production data migration for schema and storage cutovers.
 *
 * Run `npx tsx scripts/migrate-production-data.ts --dry-run`, review every
 * unresolved/failure entry, then use `--execute` followed by `--verify`.
 * The default mode is dry-run. This script never invents an ambiguous booking
 * state and can be restarted safely after a partial document migration.
 */
import {
  DeleteObjectCommand,
  GetObjectCommand,
  type GetObjectCommandOutput,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { Prisma, PrismaClient, ReservationStatus } from "@prisma/client";

import { DEFAULT_AMENITIES } from "../constants/defaultAmenities";
import { asEndOfDayMinutes, labelToMinutes } from "../lib/scheduling";
import { isTrustedR2PublicUrl } from "../lib/storage/publicUrl";
import { r2 } from "../lib/storage/r2";

const prisma = new PrismaClient();
const execute = process.argv.includes("--execute");
const verifyOnly = process.argv.includes("--verify");
const requestedDryRun = process.argv.includes("--dry-run");
const dryRun = !execute;
const PRIVATE_REF_PREFIX = "r2-private://";
const DOCUMENT_LIMIT_BYTES = 10_000_000;
const UPDATE_BATCH_SIZE = 500;
const CONFIRMED_TEST_CUSTOM_AMENITIES = [
  { id: "690384234346df7be4a80b72", userId: "655e1978bc82b10f2b6bbdaa", name: "Test" },
  { id: "69038a284346df7be4a80b73", userId: "655e1978bc82b10f2b6bbdaa", name: "Test 2" },
] as const;

if ([execute, verifyOnly, requestedDryRun].filter(Boolean).length > 1) {
  throw new Error("Use only one migration mode: --dry-run, --execute, or --verify");
}

const batchSizeArgument = process.argv.find((argument) => argument.startsWith("--batch-size="));
const parsedBatchSize = batchSizeArgument ? Number(batchSizeArgument.split("=", 2)[1]) : 25;
if (!Number.isInteger(parsedBatchSize) || parsedBatchSize < 1 || parsedBatchSize > 100) {
  throw new Error("--batch-size must be an integer from 1 to 100");
}
const documentBatchSize = parsedBatchSize;

function migrationEnvironmentIssues() {
  const required = [
    "CLOUDFLARE_R2_ACCOUNT_ID",
    "CLOUDFLARE_R2_ACCESS_KEY_ID",
    "CLOUDFLARE_R2_SECRET_ACCESS_KEY",
    "CLOUDFLARE_R2_BUCKET_NAME",
    "CLOUDFLARE_R2_PRIVATE_BUCKET_NAME",
    "NEXT_PUBLIC_CLOUDFLARE_PUBLIC_URL",
  ] as const;
  const issues = required
    .filter((name) => !process.env[name]?.trim())
    .map((name) => `Missing ${name}`);
  const publicBucket = process.env.CLOUDFLARE_R2_BUCKET_NAME?.trim();
  const privateBucket = process.env.CLOUDFLARE_R2_PRIVATE_BUCKET_NAME?.trim();
  if (publicBucket && privateBucket && publicBucket === privateBucket) {
    issues.push("Public and private R2 buckets must be different");
  }
  const publicBase = process.env.NEXT_PUBLIC_CLOUDFLARE_PUBLIC_URL?.trim();
  if (publicBase) {
    try {
      const parsed = new URL(publicBase);
      if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash) {
        issues.push("NEXT_PUBLIC_CLOUDFLARE_PUBLIC_URL must be a clean HTTPS URL");
      }
    } catch {
      issues.push("NEXT_PUBLIC_CLOUDFLARE_PUBLIC_URL is invalid");
    }
  }
  return issues;
}

const environmentIssues = migrationEnvironmentIssues();
if ((execute || verifyOnly) && environmentIssues.length > 0) {
  throw new Error(`Migration environment preflight failed: ${environmentIssues.join("; ")}`);
}

type ReservationMigrationRow = {
  id: string;
  status: ReservationStatus | null;
  isApproved: number | null;
  checkedInAt: Date | null;
  completedAt: Date | null;
};

type MigrationFailure = { kind: string; id: string; error: string };
type StorageCleanup = { bucket: string; key: string };

type DocumentStats = {
  scanned: number;
  publicReferences: number;
  unsupportedReferences: number;
  migratedRecords: number;
  failures: MigrationFailure[];
};

type DuplicateStats = {
  amenityGroups: number;
  billingGroups: number;
  reviewGroups: number;
  duplicateIds: string[];
};

type AmenityCatalogStats = {
  missingDefaults: number;
  mismatchedDefaults: number;
  legacyGlobalAmenities: number;
  listingsToUpdate: number;
  danglingReferences: number;
  danglingIds: string[];
};

type BookingDurationStats = {
  listingMinimumsAdjusted: number;
  packagesDisabled: number;
  listingIds: string[];
  packageIds: string[];
};

const RESERVATION_STATUSES = new Set<ReservationStatus>([
  "PENDING_APPROVAL",
  "CONFIRMED",
  "CHECKED_IN",
  "COMPLETED",
  "NO_SHOW",
  "CANCELLED",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
]);

function targetStatus(reservation: ReservationMigrationRow): ReservationStatus | null {
  if (reservation.status) return reservation.status;
  if (reservation.completedAt) return "COMPLETED";
  if (reservation.checkedInAt) return "CHECKED_IN";
  if (reservation.isApproved === 1) return "CONFIRMED";
  if (reservation.isApproved === 0) return "PENDING_APPROVAL";
  if (reservation.isApproved === 2 || reservation.isApproved === 3) return "CANCELLED";
  return null;
}

function legacyApprovalFor(status: ReservationStatus) {
  if (status === "PENDING_APPROVAL") return 0;
  if (status === "CONFIRMED" || status === "CHECKED_IN") return 1;
  if (status === "COMPLETED") return 2;
  return 3;
}

function rawObjectId(value: unknown): string | null {
  if (typeof value === "string" && /^[a-f\d]{24}$/i.test(value)) return value;
  if (value && typeof value === "object" && "$oid" in value) {
    const oid = (value as { $oid?: unknown }).$oid;
    return typeof oid === "string" && /^[a-f\d]{24}$/i.test(oid) ? oid : null;
  }
  return null;
}

function rawDate(value: unknown): Date | null {
  const candidate = value && typeof value === "object" && "$date" in value
    ? (value as { $date?: unknown }).$date
    : value;
  if (typeof candidate !== "string" && typeof candidate !== "number" && !(candidate instanceof Date)) return null;
  const date = candidate instanceof Date ? new Date(candidate.getTime()) : new Date(candidate);
  return Number.isFinite(date.getTime()) ? date : null;
}

async function loadReservationRows(): Promise<ReservationMigrationRow[]> {
  const rawDocuments = await prisma.reservation.aggregateRaw({
    pipeline: [{
      $project: { _id: 1, status: 1, isApproved: 1, checkedInAt: 1, completedAt: 1 },
    }],
  });
  return (rawDocuments as unknown as unknown[]).flatMap((document) => {
    const raw = document as Record<string, unknown>;
    const id = rawObjectId(raw._id);
    if (!id) return [];
    const status = typeof raw.status === "string" && RESERVATION_STATUSES.has(raw.status as ReservationStatus)
      ? raw.status as ReservationStatus
      : null;
    return [{
      id,
      status,
      isApproved: typeof raw.isApproved === "number" && Number.isInteger(raw.isApproved) ? raw.isApproved : null,
      checkedInAt: rawDate(raw.checkedInAt),
      completedAt: rawDate(raw.completedAt),
    }];
  });
}

async function rawMissingCount(model: "Reservation" | "Listing", field: string) {
  const result = await prisma.$runCommandRaw({
    count: model,
    query: { [field]: { $exists: false } },
  }) as { n?: unknown };
  return typeof result.n === "number" ? result.n : 0;
}

async function countTransactionsWithoutPurpose() {
  const rawCounts = await prisma.transaction.aggregateRaw({
    pipeline: [
      { $match: { $or: [{ purpose: { $exists: false } }, { purpose: null }] } },
      { $count: "total" },
    ],
  });
  const first = (rawCounts as unknown as unknown[])[0] as Record<string, unknown> | undefined;
  return typeof first?.total === "number" ? first.total : 0;
}

function chunks<T>(values: T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size));
  return result;
}

async function migrateReservationLifecycle(rows: ReservationMigrationRow[]) {
  const unresolvedRows = rows.filter((row) => targetStatus(row) === null);
  const mismatchedRows = rows.filter((row) => {
    const status = targetStatus(row);
    return status !== null && (row.status !== status || row.isApproved !== legacyApprovalFor(status));
  });

  const updateCounts: Record<string, number> = {};
  if (execute) {
    const groups = new Map<ReservationStatus, string[]>();
    for (const row of mismatchedRows) {
      const status = targetStatus(row);
      if (!status) continue;
      const ids = groups.get(status) || [];
      ids.push(row.id);
      groups.set(status, ids);
    }
    for (const [status, ids] of groups) {
      updateCounts[status] = ids.length;
      for (const idBatch of chunks(ids, UPDATE_BATCH_SIZE)) {
        await prisma.reservation.updateMany({
          where: { id: { in: idBatch } },
          data: { status, isApproved: legacyApprovalFor(status) },
        });
      }
    }
  }

  return {
    scanned: rows.length,
    mismatched: mismatchedRows.length,
    unresolved: unresolvedRows.length,
    unresolvedIds: unresolvedRows.slice(0, 50).map((row) => row.id),
    updateCounts,
  };
}

async function backfillCompatibilityFields() {
  const fields = [
    { model: "Reservation" as const, field: "hiddenByGuestAt", value: null },
    { model: "Reservation" as const, field: "hiddenByOwnerAt", value: null },
    { model: "Reservation" as const, field: "reviewReminderAttempts", value: 0 },
    { model: "Listing" as const, field: "archivedAt", value: null },
    { model: "Listing" as const, field: "archivedById", value: null },
  ];
  const missing: Record<string, number> = {};
  for (const entry of fields) {
    const key = `${entry.model}.${entry.field}`;
    missing[key] = await rawMissingCount(entry.model, entry.field);
    if (execute && missing[key] > 0) {
      await prisma.$runCommandRaw({
        update: entry.model,
        updates: [{
          q: { [entry.field]: { $exists: false } },
          u: { $set: { [entry.field]: entry.value } },
          multi: true,
        }],
      });
    }
  }
  return missing;
}

async function migrateLegacyDeactivatedOwners() {
  const users = await prisma.user.findMany({
    where: { markedForDeletion: true },
    select: { id: true, markedForDeletionAt: true },
  });
  let affectedListings = 0;
  for (const user of users) {
    const where: Prisma.ListingWhereInput = {
      userId: user.id,
      active: true,
      OR: [{ accountDeactivatedAt: null }, { accountDeactivatedAt: { isSet: false } }],
    };
    const count = await prisma.listing.count({ where });
    affectedListings += count;
    if (execute && count > 0) {
      await prisma.listing.updateMany({
        where,
        data: {
          active: false,
          accountDeactivatedAt: user.markedForDeletionAt || new Date(),
        },
      });
    }
  }
  return { deactivatedUsers: users.length, affectedListings };
}

function groupBy<T>(values: T[], keyFor: (value: T) => string) {
  const result = new Map<string, T[]>();
  for (const value of values) {
    const key = keyFor(value);
    const group = result.get(key) || [];
    group.push(value);
    result.set(key, group);
  }
  return result;
}

function appendCustomAmenity(values: string[], name: string) {
  const normalized = name.trim();
  if (!normalized || values.some((value) => value.toLocaleLowerCase() === normalized.toLocaleLowerCase())) return values;
  return [...values, normalized];
}

async function migrateAmenityCatalog(): Promise<AmenityCatalogStats> {
  const [amenities, listings] = await Promise.all([
    prisma.amenities.findMany({ select: { id: true, name: true, icon: true } }),
    prisma.listing.findMany({ select: { id: true, amenities: true, otherAmenities: true } }),
  ]);
  const defaultIds = new Set<string>(DEFAULT_AMENITIES.map((amenity) => amenity.id));
  const defaultByName = new Map(DEFAULT_AMENITIES.map((amenity) => [amenity.name.toLocaleLowerCase(), amenity]));
  const amenityById = new Map(amenities.map((amenity) => [amenity.id, amenity]));
  const iconByDefaultId = new Map<string, Prisma.JsonValue | null>();
  for (const amenity of amenities) {
    const matchingDefault = defaultByName.get(amenity.name.trim().toLocaleLowerCase());
    if (matchingDefault && amenity.icon != null && !iconByDefaultId.has(matchingDefault.id)) {
      iconByDefaultId.set(matchingDefault.id, amenity.icon);
    }
  }

  const updates: Array<{ id: string; amenities: string[]; otherAmenities: string[] }> = [];
  const danglingIds = new Set<string>();
  for (const listing of listings) {
    const defaultSelections: string[] = [];
    let customSelections = [...listing.otherAmenities];
    for (const amenityId of listing.amenities) {
      const amenity = amenityById.get(amenityId);
      if (!amenity) {
        // Some legacy listings stored the selected amenity name instead of
        // its ObjectId. Canonical default names can be remapped without
        // guessing; other literal names are preserved as listing-specific
        // custom amenities. A missing ObjectId remains unresolved because its
        // original name cannot be recovered safely.
        const legacyName = amenityId.trim();
        const matchingDefault = defaultByName.get(legacyName.toLocaleLowerCase());
        if (matchingDefault) {
          defaultSelections.push(matchingDefault.id);
        } else if (!/^[a-f\d]{24}$/i.test(legacyName)) {
          customSelections = appendCustomAmenity(customSelections, legacyName);
        } else {
          danglingIds.add(amenityId);
        }
        continue;
      }
      if (defaultIds.has(amenity.id)) {
        defaultSelections.push(amenity.id);
        continue;
      }
      const matchingDefault = defaultByName.get(amenity.name.trim().toLocaleLowerCase());
      if (matchingDefault) {
        defaultSelections.push(matchingDefault.id);
      } else {
        // Before admin ownership was enforced, owner-created entries were put
        // in the global table. Preserve them only on listings that selected
        // them, using the listing-specific custom amenity field.
        customSelections = appendCustomAmenity(customSelections, amenity.name);
      }
    }
    const nextAmenities = Array.from(new Set(defaultSelections));
    if (
      JSON.stringify(nextAmenities) !== JSON.stringify(listing.amenities)
      || JSON.stringify(customSelections) !== JSON.stringify(listing.otherAmenities)
    ) {
      updates.push({ id: listing.id, amenities: nextAmenities, otherAmenities: customSelections });
    }
  }

  const stats: AmenityCatalogStats = {
    missingDefaults: DEFAULT_AMENITIES.filter((amenity) => !amenityById.has(amenity.id)).length,
    mismatchedDefaults: DEFAULT_AMENITIES.filter((amenity) => {
      const existing = amenityById.get(amenity.id);
      return Boolean(existing && existing.name !== amenity.name);
    }).length,
    legacyGlobalAmenities: amenities.filter((amenity) => !defaultIds.has(amenity.id)).length,
    listingsToUpdate: updates.length,
    danglingReferences: danglingIds.size,
    danglingIds: Array.from(danglingIds).slice(0, 100),
  };

  if (execute) {
    // Listing updates are intentionally outside one large Mongo transaction;
    // this keeps the migration restartable for catalogs used by many listings
    // and avoids transaction duration/size limits in production.
    for (const update of updates) {
      await prisma.listing.update({
        where: { id: update.id },
        data: { amenities: update.amenities, otherAmenities: update.otherAmenities },
      });
    }
    await prisma.$transaction(async (tx) => {
      await tx.amenities.deleteMany({ where: { id: { notIn: Array.from(defaultIds) } } });
      for (const amenity of DEFAULT_AMENITIES) {
        if (amenityById.has(amenity.id)) continue;
        const icon = iconByDefaultId.get(amenity.id);
        await tx.amenities.create({
          data: { id: amenity.id, name: amenity.name, ...(icon != null ? { icon: icon as Prisma.InputJsonValue } : {}) },
        });
      }
    });
  }
  return stats;
}

function operatingWindowHours(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return 24;
  const hours = value as { start?: unknown; end?: unknown };
  const start = labelToMinutes(typeof hours.start === "string" ? hours.start : "");
  const rawEnd = labelToMinutes(typeof hours.end === "string" ? hours.end : "");
  const end = asEndOfDayMinutes(rawEnd);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 24;
  return Math.min(24, (end - start) / 60);
}

async function migrateBookingDurations(): Promise<BookingDurationStats> {
  const listings = await prisma.listing.findMany({
    select: {
      id: true,
      operationalHours: true,
      minimumBookingHours: true,
      packages: { select: { id: true, durationHours: true, isActive: true } },
    },
  });
  const listingUpdates: Array<{ id: string; minimumBookingHours: number }> = [];
  const packageIds: string[] = [];
  for (const listing of listings) {
    const maximumHours = operatingWindowHours(listing.operationalHours);
    if (listing.minimumBookingHours != null && listing.minimumBookingHours > maximumHours) {
      listingUpdates.push({ id: listing.id, minimumBookingHours: Math.max(0, Math.floor(maximumHours)) });
    }
    for (const pkg of listing.packages) {
      if (pkg.isActive && pkg.durationHours > maximumHours) packageIds.push(pkg.id);
    }
  }
  if (execute) {
    for (const update of listingUpdates) {
      await prisma.listing.update({
        where: { id: update.id },
        data: { minimumBookingHours: update.minimumBookingHours },
      });
    }
    for (const idBatch of chunks(packageIds, UPDATE_BATCH_SIZE)) {
      await prisma.package.updateMany({ where: { id: { in: idBatch } }, data: { isActive: false } });
    }
  }
  return {
    listingMinimumsAdjusted: listingUpdates.length,
    packagesDisabled: packageIds.length,
    listingIds: listingUpdates.slice(0, 100).map((listing) => listing.id),
    packageIds: packageIds.slice(0, 100),
  };
}

async function migrateLegacyCustomAmenities() {
  const rows = await prisma.customAmenities.findMany({
    select: { id: true, userId: true, name: true },
  });
  const confirmedById = new Map<string, { userId: string; name: string }>(
    CONFIRMED_TEST_CUSTOM_AMENITIES.map((row) => [row.id, { userId: row.userId, name: row.name }]),
  );
  const confirmedTestRows = rows.filter((row) => {
    const expected = confirmedById.get(row.id);
    return Boolean(expected && expected.userId === row.userId && expected.name === row.name);
  });
  const confirmedIds = new Set(confirmedTestRows.map((row) => row.id));
  const unresolvedRows = rows.filter((row) => !confirmedIds.has(row.id));

  if (execute && confirmedTestRows.length > 0) {
    await prisma.customAmenities.deleteMany({
      where: { id: { in: confirmedTestRows.map((row) => row.id) } },
    });
  }

  return {
    total: rows.length,
    confirmedTestRowsToDelete: confirmedTestRows.length,
    unresolved: unresolvedRows.length,
    unresolvedIds: unresolvedRows.slice(0, 100).map((row) => row.id),
  };
}

async function reconcileUniqueIndexDuplicates(): Promise<DuplicateStats> {
  const stats: DuplicateStats = {
    amenityGroups: 0,
    billingGroups: 0,
    reviewGroups: 0,
    duplicateIds: [],
  };

  const amenities = await prisma.amenities.findMany({
    select: { id: true, name: true, createdAt: true },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  for (const group of groupBy(amenities, (amenity) => amenity.name).values()) {
    if (group.length < 2) continue;
    stats.amenityGroups += 1;
    const [canonical, ...duplicates] = group;
    const duplicateIds = duplicates.map((amenity) => amenity.id);
    stats.duplicateIds.push(...duplicateIds);
    if (!execute) continue;
    await prisma.$transaction(async (tx) => {
      const listings = await tx.listing.findMany({
        where: { amenities: { hasSome: duplicateIds } },
        select: { id: true, amenities: true },
      });
      for (const listing of listings) {
        const next = Array.from(new Set(listing.amenities.map((id) => duplicateIds.includes(id) ? canonical.id : id)));
        await tx.listing.update({ where: { id: listing.id }, data: { amenities: next } });
      }
      await tx.amenities.deleteMany({ where: { id: { in: duplicateIds } } });
    });
  }

  const billingDetails = await prisma.billingDetails.findMany({
    select: { id: true, userId: true, gstin: true, createdAt: true },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  for (const group of groupBy(billingDetails, (billing) => `${billing.userId}\u0000${billing.gstin}`).values()) {
    if (group.length < 2) continue;
    stats.billingGroups += 1;
    const [canonical, ...duplicates] = group;
    const duplicateIds = duplicates.map((billing) => billing.id);
    stats.duplicateIds.push(...duplicateIds);
    if (!execute) continue;
    await prisma.$transaction(async (tx) => {
      await tx.reservation.updateMany({
        where: { billingDetailId: { in: duplicateIds } },
        data: { billingDetailId: canonical.id },
      });
      await tx.invoice.updateMany({
        where: { billingId: { in: duplicateIds } },
        data: { billingId: canonical.id },
      });
      await tx.billingDetails.deleteMany({ where: { id: { in: duplicateIds } } });
    });
  }

  const reviews = await prisma.review.findMany({
    select: { id: true, userId: true, reservationId: true, listingId: true, createdAt: true },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  const reviewListingIds = new Set<string>();
  for (const group of groupBy(reviews, (review) => `${review.reservationId}\u0000${review.userId}`).values()) {
    if (group.length < 2) continue;
    stats.reviewGroups += 1;
    const duplicates = group.slice(1);
    const duplicateIds = duplicates.map((review) => review.id);
    stats.duplicateIds.push(...duplicateIds);
    for (const review of group) reviewListingIds.add(review.listingId);
    if (execute) await prisma.review.deleteMany({ where: { id: { in: duplicateIds } } });
  }
  if (execute) {
    for (const listingId of reviewListingIds) {
      const aggregate = await prisma.review.aggregate({
        where: { listingId },
        _avg: { rating: true },
      });
      await prisma.listing.updateMany({
        where: { id: listingId },
        data: { avgReviewRating: aggregate._avg.rating },
      });
    }
  }

  stats.duplicateIds = stats.duplicateIds.slice(0, 100);
  return stats;
}

function assertStorageKey(value: string) {
  const key = value.trim().replace(/^\/+/, "");
  if (!key || key.length > 1_024 || key.includes("..") || key.includes("\\") || /[\u0000-\u001f]/.test(key)) {
    throw new Error("Invalid document storage key");
  }
  return key;
}

function privateDocumentKey(ref: string) {
  if (!ref.startsWith(PRIVATE_REF_PREFIX)) return null;
  try {
    return assertStorageKey(ref.slice(PRIVATE_REF_PREFIX.length));
  } catch {
    return null;
  }
}

function publicDocumentKey(url: string) {
  if (!isTrustedR2PublicUrl(url)) return null;
  const configured = process.env.NEXT_PUBLIC_CLOUDFLARE_PUBLIC_URL;
  if (!configured) return null;
  try {
    const base = new URL(configured);
    const candidate = new URL(url);
    const basePath = base.pathname.replace(/\/+$/, "");
    const encodedKey = candidate.pathname.slice(basePath.length).replace(/^\/+/, "");
    if (!encodedKey) return null;
    return assertStorageKey(encodedKey.split("/").map(decodeURIComponent).join("/"));
  } catch {
    return null;
  }
}

function isMissingObject(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { name?: string; $metadata?: { httpStatusCode?: number } };
  return candidate.name === "NotFound" || candidate.name === "NoSuchKey" || candidate.$metadata?.httpStatusCode === 404;
}

async function copyDocumentToPrivate(ref: string, requestedTargetKey?: string) {
  const existingPrivateKey = privateDocumentKey(ref);
  const publicKey = publicDocumentKey(ref);
  const publicBucket = process.env.CLOUDFLARE_R2_BUCKET_NAME?.trim();
  const privateBucket = process.env.CLOUDFLARE_R2_PRIVATE_BUCKET_NAME?.trim();
  const sourceKey = existingPrivateKey || publicKey;
  if (!sourceKey || !publicBucket || !privateBucket) throw new Error("Missing or invalid public/private R2 configuration");
  const targetKey = assertStorageKey(requestedTargetKey || sourceKey);
  const sourceBucket = existingPrivateKey ? privateBucket : publicBucket;
  const cleanup = sourceBucket === privateBucket && sourceKey === targetKey
    ? null
    : { bucket: sourceBucket, key: sourceKey };

  try {
    await r2.send(new HeadObjectCommand({ Bucket: privateBucket, Key: targetKey }));
    return { storageRef: `${PRIVATE_REF_PREFIX}${targetKey}`, cleanup };
  } catch (error) {
    if (!isMissingObject(error)) throw error;
  }

  let actualSourceBucket = sourceBucket;
  let source: GetObjectCommandOutput;
  try {
    source = await r2.send(new GetObjectCommand({ Bucket: actualSourceBucket, Key: sourceKey }));
  } catch (error) {
    // A prior interrupted migration may already have removed the public copy
    // after placing the same key in the private bucket.
    if (!existingPrivateKey && isMissingObject(error)) {
      actualSourceBucket = privateBucket;
      source = await r2.send(new GetObjectCommand({ Bucket: actualSourceBucket, Key: sourceKey }));
    } else {
      throw error;
    }
  }
  if (!source.Body) throw new Error("Document body is unavailable");
  if (typeof source.ContentLength === "number" && source.ContentLength > DOCUMENT_LIMIT_BYTES) {
    throw new Error("Document exceeds the 10 MB migration limit");
  }
  const bytes = await source.Body.transformToByteArray();
  if (bytes.byteLength > DOCUMENT_LIMIT_BYTES) throw new Error("Document exceeds the 10 MB migration limit");

  await r2.send(new PutObjectCommand({
    Bucket: privateBucket,
    Key: targetKey,
    Body: bytes,
    ContentType: source.ContentType || "application/pdf",
    CacheControl: "private, no-store",
  }));
  const effectiveCleanup = actualSourceBucket === privateBucket && sourceKey === targetKey
    ? null
    : { bucket: actualSourceBucket, key: sourceKey };
  return { storageRef: `${PRIVATE_REF_PREFIX}${targetKey}`, cleanup: effectiveCleanup };
}

async function cleanupMigratedSources(cleanups: Array<StorageCleanup | null>) {
  const unique = new Map<string, StorageCleanup>();
  for (const cleanup of cleanups) {
    if (cleanup) unique.set(`${cleanup.bucket}\u0000${cleanup.key}`, cleanup);
  }
  for (const cleanup of unique.values()) {
    await r2.send(new DeleteObjectCommand({ Bucket: cleanup.bucket, Key: cleanup.key }));
  }
}

function safePathSegment(value: string, fallback: string) {
  const safe = value.trim().replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(0, 120);
  return safe || fallback;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function documentRef(document: Record<string, unknown>) {
  for (const key of ["storageRef", "pdfUrl", "url"] as const) {
    if (typeof document[key] === "string" && document[key]) return document[key];
  }
  return null;
}

function listingDocumentReferenceStats(verifications: unknown) {
  const candidates = listingDocumentReferences(verifications);
  let publicReferences = 0;
  let unsupportedReferences = 0;
  for (const document of candidates) {
    const ref = documentRef(document);
    if (!ref || privateDocumentKey(ref)) continue;
    if (publicDocumentKey(ref)) publicReferences += 1;
    else unsupportedReferences += 1;
  }
  return { publicReferences, unsupportedReferences };
}

function listingDocumentReferences(verifications: unknown) {
  const record = asRecord(verifications);
  const documents = Array.isArray(record.documents) ? record.documents : [];
  return [...documents.map(asRecord), asRecord(record.agreementPdf)];
}

async function verifyPrivateReference(ref: string) {
  const key = privateDocumentKey(ref);
  const bucket = process.env.CLOUDFLARE_R2_PRIVATE_BUCKET_NAME?.trim();
  if (!key || !bucket) throw new Error("Invalid private document reference or bucket configuration");
  await r2.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
}

async function migrateListingDocumentRecord(document: Record<string, unknown>, targetKey: string) {
  const ref = documentRef(document);
  if (!ref || !publicDocumentKey(ref)) return false;
  const migrated = await copyDocumentToPrivate(ref, targetKey);
  document.storageRef = migrated.storageRef;
  delete document.pdfUrl;
  delete document.url;
  return migrated.cleanup;
}

async function migratePrivateDocuments(): Promise<DocumentStats> {
  const stats: DocumentStats = {
    scanned: 0,
    publicReferences: 0,
    unsupportedReferences: 0,
    migratedRecords: 0,
    failures: [],
  };

  let invoiceCursor: string | undefined;
  do {
    const rows = await prisma.invoice.findMany({
      where: { ...(invoiceCursor ? { id: { gt: invoiceCursor } } : {}), invoiceUrl: { not: "" } },
      select: {
        id: true,
        invoiceUrl: true,
        invoiceNumber: true,
        userId: true,
        financialYear: true,
        documentType: true,
      },
      orderBy: { id: "asc" },
      take: documentBatchSize,
    });
    for (const row of rows) {
      stats.scanned += 1;
      if (privateDocumentKey(row.invoiceUrl)) {
        if (verifyOnly) {
          try {
            await verifyPrivateReference(row.invoiceUrl);
          } catch (error) {
            stats.failures.push({
              kind: "invoice",
              id: row.id,
              error: error instanceof Error ? error.message : "Private object verification failed",
            });
          }
        }
        continue;
      }
      if (!publicDocumentKey(row.invoiceUrl)) {
        stats.unsupportedReferences += 1;
        stats.failures.push({ kind: "invoice", id: row.id, error: "Unsupported document reference" });
        continue;
      }
      stats.publicReferences += 1;
      if (!execute) continue;
      try {
        const targetKey = [
          "users",
          row.userId,
          "billing",
          "invoices",
          safePathSegment(row.financialYear || "legacy", "legacy"),
          row.documentType,
          row.id,
          `${safePathSegment(row.invoiceNumber, row.id)}.pdf`,
        ].join("/");
        const migrated = await copyDocumentToPrivate(row.invoiceUrl, targetKey);
        const result = await prisma.invoice.updateMany({
          where: { id: row.id, invoiceUrl: row.invoiceUrl },
          data: { invoiceUrl: migrated.storageRef },
        });
        if (result.count !== 1) throw new Error("Invoice changed during migration; retry the migration");
        try {
          await cleanupMigratedSources([migrated.cleanup]);
        } catch (cleanupError) {
          await prisma.invoice.updateMany({
            where: { id: row.id, invoiceUrl: migrated.storageRef },
            data: { invoiceUrl: row.invoiceUrl },
          });
          throw cleanupError;
        }
        stats.migratedRecords += 1;
      } catch (error) {
        stats.failures.push({ kind: "invoice", id: row.id, error: error instanceof Error ? error.message : "Migration failed" });
      }
    }
    invoiceCursor = rows.at(-1)?.id;
    if (rows.length < documentBatchSize) break;
  } while (invoiceCursor);

  let voucherCursor: string | undefined;
  do {
    const rows = await prisma.paymentVoucher.findMany({
      where: { ...(voucherCursor ? { id: { gt: voucherCursor } } : {}), voucherUrl: { not: "" } },
      select: {
        id: true,
        voucherUrl: true,
        voucherNumber: true,
        userId: true,
        financialYear: true,
        voucherType: true,
      },
      orderBy: { id: "asc" },
      take: documentBatchSize,
    });
    for (const row of rows) {
      stats.scanned += 1;
      if (privateDocumentKey(row.voucherUrl)) {
        if (verifyOnly) {
          try {
            await verifyPrivateReference(row.voucherUrl);
          } catch (error) {
            stats.failures.push({
              kind: "voucher",
              id: row.id,
              error: error instanceof Error ? error.message : "Private object verification failed",
            });
          }
        }
        continue;
      }
      if (!publicDocumentKey(row.voucherUrl)) {
        stats.unsupportedReferences += 1;
        stats.failures.push({ kind: "voucher", id: row.id, error: "Unsupported document reference" });
        continue;
      }
      stats.publicReferences += 1;
      if (!execute) continue;
      try {
        const targetKey = [
          "users",
          row.userId,
          "billing",
          "vouchers",
          safePathSegment(row.financialYear, "legacy"),
          row.voucherType,
          row.id,
          `${safePathSegment(row.voucherNumber, row.id)}.pdf`,
        ].join("/");
        const migrated = await copyDocumentToPrivate(row.voucherUrl, targetKey);
        const result = await prisma.paymentVoucher.updateMany({
          where: { id: row.id, voucherUrl: row.voucherUrl },
          data: { voucherUrl: migrated.storageRef },
        });
        if (result.count !== 1) throw new Error("Voucher changed during migration; retry the migration");
        try {
          await cleanupMigratedSources([migrated.cleanup]);
        } catch (cleanupError) {
          await prisma.paymentVoucher.updateMany({
            where: { id: row.id, voucherUrl: migrated.storageRef },
            data: { voucherUrl: row.voucherUrl },
          });
          throw cleanupError;
        }
        stats.migratedRecords += 1;
      } catch (error) {
        stats.failures.push({ kind: "voucher", id: row.id, error: error instanceof Error ? error.message : "Migration failed" });
      }
    }
    voucherCursor = rows.at(-1)?.id;
    if (rows.length < documentBatchSize) break;
  } while (voucherCursor);

  let listingCursor: string | undefined;
  do {
    const rows = await prisma.listing.findMany({
      where: listingCursor ? { id: { gt: listingCursor } } : undefined,
      select: { id: true, userId: true, verifications: true },
      orderBy: { id: "asc" },
      take: documentBatchSize,
    });
    for (const row of rows) {
      stats.scanned += 1;
      const referenceStats = listingDocumentReferenceStats(row.verifications);
      const { publicReferences, unsupportedReferences } = referenceStats;
      stats.publicReferences += publicReferences;
      stats.unsupportedReferences += unsupportedReferences;
      if (unsupportedReferences > 0) {
        stats.failures.push({ kind: "listing", id: row.id, error: `${unsupportedReferences} unsupported document reference(s)` });
      }
      if (verifyOnly) {
        const privateRefs = listingDocumentReferences(row.verifications)
          .map(documentRef)
          .filter((ref): ref is string => Boolean(ref && privateDocumentKey(ref)));
        for (const ref of privateRefs) {
          try {
            await verifyPrivateReference(ref);
          } catch (error) {
            stats.failures.push({
              kind: "listing",
              id: row.id,
              error: error instanceof Error ? error.message : "Private object verification failed",
            });
          }
        }
      }
      if (!execute || publicReferences === 0) continue;
      try {
        const original = row.verifications;
        const verifications = asRecord(structuredClone(original));
        let changed = false;
        const cleanups: Array<StorageCleanup | null> = [];
        const documents = Array.isArray(verifications.documents) ? verifications.documents : [];
        for (let index = 0; index < documents.length; index += 1) {
          const cleanup = await migrateListingDocumentRecord(
            asRecord(documents[index]),
            `users/${row.userId}/listings/${row.id}/compliance/verification/general/document-${index + 1}.pdf`,
          );
          if (cleanup !== false) {
            changed = true;
            cleanups.push(cleanup);
          }
        }
        const agreementCleanup = await migrateListingDocumentRecord(
          asRecord(verifications.agreementPdf),
          `users/${row.userId}/listings/${row.id}/compliance/agreements/migrated/signed.pdf`,
        );
        if (agreementCleanup !== false) {
          changed = true;
          cleanups.push(agreementCleanup);
        }
        if (!changed) continue;
        const result = await prisma.listing.updateMany({
          where: {
            id: row.id,
            verifications: { equals: original as Prisma.InputJsonValue },
          },
          data: { verifications: verifications as Prisma.InputJsonValue },
        });
        if (result.count !== 1) throw new Error("Listing changed during migration; retry the migration");
        try {
          await cleanupMigratedSources(cleanups);
        } catch (cleanupError) {
          await prisma.listing.updateMany({
            where: {
              id: row.id,
              verifications: { equals: verifications as Prisma.InputJsonValue },
            },
            data: { verifications: original as Prisma.InputJsonValue },
          });
          throw cleanupError;
        }
        stats.migratedRecords += 1;
      } catch (error) {
        stats.failures.push({ kind: "listing", id: row.id, error: error instanceof Error ? error.message : "Migration failed" });
      }
    }
    listingCursor = rows.at(-1)?.id;
    if (rows.length < documentBatchSize) break;
  } while (listingCursor);

  return stats;
}

async function main() {
  const rows = await loadReservationRows();
  const lifecycle = await migrateReservationLifecycle(rows);
  const compatibilityFields = await backfillCompatibilityFields();
  const deactivatedOwners = await migrateLegacyDeactivatedOwners();
  const amenityCatalog = await migrateAmenityCatalog();
  const legacyCustomAmenities = await migrateLegacyCustomAmenities();
  const bookingDurations = await migrateBookingDurations();
  const uniqueIndexDuplicates = await reconcileUniqueIndexDuplicates();
  const transactionsWithoutPurpose = await countTransactionsWithoutPurpose();

  if (execute && transactionsWithoutPurpose > 0) {
    await prisma.$runCommandRaw({
      update: "Transaction",
      updates: [{
        q: { $or: [{ purpose: { $exists: false } }, { purpose: null }] },
        u: { $set: { purpose: "BASE_BOOKING" } },
        multi: true,
      }],
    });
  }

  const documents = await migratePrivateDocuments();
  const result = {
    mode: verifyOnly ? "verify" : dryRun ? "dry-run" : "execute",
    environmentIssues,
    lifecycle,
    transactionsWithoutPurpose,
    compatibilityFields,
    deactivatedOwners,
    amenityCatalog,
    legacyCustomAmenities,
    bookingDurations,
    uniqueIndexDuplicates,
    documents,
  };
  console.warn("Production data migration complete", result);

  const missingCompatibilityFields = Object.values(compatibilityFields).reduce((total, count) => total + count, 0);
  const hasOutstandingWork = environmentIssues.length > 0
    || lifecycle.mismatched > 0
    || lifecycle.unresolved > 0
    || transactionsWithoutPurpose > 0
    || missingCompatibilityFields > 0
    || deactivatedOwners.affectedListings > 0
    || amenityCatalog.missingDefaults > 0
    || amenityCatalog.legacyGlobalAmenities > 0
    || amenityCatalog.listingsToUpdate > 0
    || amenityCatalog.danglingReferences > 0
    || legacyCustomAmenities.confirmedTestRowsToDelete > 0
    || legacyCustomAmenities.unresolved > 0
    || bookingDurations.listingMinimumsAdjusted > 0
    || bookingDurations.packagesDisabled > 0
    || uniqueIndexDuplicates.amenityGroups > 0
    || uniqueIndexDuplicates.billingGroups > 0
    || uniqueIndexDuplicates.reviewGroups > 0
    || documents.publicReferences > 0
    || documents.unsupportedReferences > 0
    || documents.failures.length > 0;
  if (verifyOnly && hasOutstandingWork) process.exitCode = 1;
  if (execute && (lifecycle.unresolved > 0 || documents.failures.length > 0)) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error("Production data migration failed", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
