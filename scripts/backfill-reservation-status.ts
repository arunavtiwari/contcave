/**
 * Backfill Reservation.status for records created before the lifecycle enum
 * was introduced, normalize the legacy isApproved compatibility field, and
 * classify pre-extension transactions as BASE_BOOKING.
 *
 * Run `npx tsx scripts/backfill-reservation-status.ts --dry-run` first, then
 * `npx tsx scripts/backfill-reservation-status.ts --execute`. The migration is
 * idempotent and never changes an explicit terminal state based only on an old
 * approval flag. `--verify` reports unresolved mismatches without writing.
 */
import { PrismaClient, ReservationStatus } from "@prisma/client";

const prisma = new PrismaClient();
const execute = process.argv.includes("--execute");
const verifyOnly = process.argv.includes("--verify");
const dryRun = !execute;

if (execute && verifyOnly) {
  throw new Error("Use either --execute or --verify, not both");
}

type ReservationMigrationRow = {
  id: string;
  status: ReservationStatus | null;
  isApproved: number | null;
  checkedInAt: Date | null;
  completedAt: Date | null;
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
  // An explicit lifecycle enum is authoritative. Timestamps and the legacy
  // compatibility field are used only when the enum is genuinely absent.
  if (reservation.status) return reservation.status;
  if (reservation.completedAt) return "COMPLETED";
  if (reservation.checkedInAt) return "CHECKED_IN";
  if (reservation.isApproved === 1) return "CONFIRMED";
  if (reservation.isApproved === 0) return "PENDING_APPROVAL";
  if (reservation.isApproved === 2 || reservation.isApproved === 3) return "CANCELLED";

  // A missing/unknown legacy value is not evidence of cancellation. Leave the
  // row untouched and require an explicit operational decision before cutover.
  return null;
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
  if (typeof candidate !== "string" && typeof candidate !== "number" && !(candidate instanceof Date)) {
    return null;
  }
  const date = candidate instanceof Date ? new Date(candidate.getTime()) : new Date(candidate);
  return Number.isFinite(date.getTime()) ? date : null;
}

async function loadRows(): Promise<ReservationMigrationRow[]> {
  // aggregateRaw deliberately bypasses Prisma's required-field decoding. That
  // keeps the migration usable for Mongo documents created before `status`
  // existed; a normal findMany can fail before those documents are backfilled.
  const rawDocuments = await prisma.reservation.aggregateRaw({
    pipeline: [{
      $project: {
        _id: 1,
        status: 1,
        isApproved: 1,
        checkedInAt: 1,
        completedAt: 1,
      },
    }],
  });

  const documents = rawDocuments as unknown as unknown[];
  return documents.flatMap((document) => {
    const raw = document as Record<string, unknown>;
    const id = rawObjectId(raw._id);
    if (!id) return [];
    const status = typeof raw.status === "string" && RESERVATION_STATUSES.has(raw.status as ReservationStatus)
      ? raw.status as ReservationStatus
      : null;
    const isApproved = typeof raw.isApproved === "number" && Number.isInteger(raw.isApproved)
      ? raw.isApproved
      : null;
    return [{
      id,
      status,
      isApproved,
      checkedInAt: rawDate(raw.checkedInAt),
      completedAt: rawDate(raw.completedAt),
    }];
  });
}

async function countTransactionsWithoutPurpose() {
  const rawCounts = await prisma.transaction.aggregateRaw({
    pipeline: [
      { $match: { $or: [{ purpose: { $exists: false } }, { purpose: null }] } },
      { $count: "total" },
    ],
  });
  const counts = rawCounts as unknown as unknown[];
  const first = counts[0] as Record<string, unknown> | undefined;
  return typeof first?.total === "number" ? first.total : 0;
}

function legacyApprovalFor(status: ReservationStatus) {
  if (status === "PENDING_APPROVAL") return 0;
  if (status === "CONFIRMED" || status === "CHECKED_IN") return 1;
  if (status === "COMPLETED") return 2;
  return 3;
}

function groupedIds(rows: ReservationMigrationRow[]) {
  const groups = new Map<ReservationStatus, string[]>();
  for (const row of rows) {
    const status = targetStatus(row);
    if (!status) continue;
    const ids = groups.get(status) || [];
    ids.push(row.id);
    groups.set(status, ids);
  }
  return groups;
}

async function main() {
  const [rows, transactionsWithoutPurpose] = await Promise.all([
    loadRows(),
    countTransactionsWithoutPurpose(),
  ]);
  const result = await prisma.$transaction(async (tx) => {
    const groups = groupedIds(rows);
    const unresolvedRows = rows.filter((row) => targetStatus(row) === null);
    const mismatchedRows = rows.filter((row) => {
      const status = targetStatus(row);
      if (!status) return false;
      return row.status !== status || row.isApproved !== legacyApprovalFor(status);
    });
    const updateGroups = groupedIds(mismatchedRows);
    const targetCounts: Record<string, number> = {};
    const updateCounts: Record<string, number> = {};

    for (const [status, ids] of groups) targetCounts[status] = ids.length;

    if (verifyOnly) {
      return {
        scanned: rows.length,
        dryRun: true,
        verifyOnly: true,
        mismatched: mismatchedRows.length,
        unresolved: unresolvedRows.length,
        unresolvedIds: unresolvedRows.slice(0, 50).map((row) => row.id),
        transactionsWithoutPurpose,
      };
    }

    for (const [status, ids] of updateGroups) {
      updateCounts[status] = ids.length;
      if (dryRun || ids.length === 0) continue;

      await tx.reservation.updateMany({
        where: { id: { in: ids } },
        data: {
          status,
          isApproved: legacyApprovalFor(status),
        },
      });
    }

    return {
      scanned: rows.length,
      dryRun,
      verifyOnly: false,
      mismatched: mismatchedRows.length,
      unresolved: unresolvedRows.length,
      unresolvedIds: unresolvedRows.slice(0, 50).map((row) => row.id),
      transactionsWithoutPurpose,
      targetCounts,
      updateCounts,
    };
  });

  if (execute && transactionsWithoutPurpose > 0) {
    // EXTENSION and ADDITIONAL_CHARGE transactions are created only by the new
    // lifecycle code and always set purpose explicitly. Therefore a legacy
    // transaction with no purpose is unambiguously the original booking.
    await prisma.$runCommandRaw({
      update: "Transaction",
      updates: [{
        q: { $or: [{ purpose: { $exists: false } }, { purpose: null }] },
        u: { $set: { purpose: "BASE_BOOKING" } },
        multi: true,
      }],
    });
  }

  console.warn(
    verifyOnly
      ? "Reservation status backfill verification complete"
      : dryRun
        ? "Reservation status backfill dry run complete"
        : "Reservation status backfill complete",
    result,
  );

  if (verifyOnly && (result.mismatched > 0 || result.unresolved > 0 || result.transactionsWithoutPurpose > 0)) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error("Reservation status backfill failed", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
