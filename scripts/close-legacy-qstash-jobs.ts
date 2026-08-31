/* eslint-disable no-console -- CLI output is the audit/verification contract. */
/**
 * Closes due historical QStash work using existing business fields.
 * Dry-run is the default; --execute is an explicit data mutation.
 *
 * npm run qstash:close-history -- --before=2026-09-01T00:00:00.000Z
 * npm run qstash:close-history -- --before=2026-09-01T00:00:00.000Z --execute
 * npm run qstash:close-history -- --before=2026-09-01T00:00:00.000Z --verify
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const execute = process.argv.includes("--execute");
const verify = process.argv.includes("--verify");
if (execute && verify) throw new Error("Use only one mode: --execute or --verify");

const beforeArgument = process.argv.find((argument) => argument.startsWith("--before="));
if (!beforeArgument) throw new Error("--before=<ISO-8601 timestamp> is required");
const before = new Date(beforeArgument.slice("--before=".length));
if (Number.isNaN(before.getTime()) || !beforeArgument.includes("T")) throw new Error("--before must be ISO-8601");
const now = new Date();
const approvalCutoff = new Date(Math.min(before.getTime(), now.getTime()) - 24 * 60 * 60 * 1000);
const extensionCutoff = new Date(Math.min(before.getTime(), now.getTime()));
const chargeCutoff = new Date(Math.min(before.getTime(), now.getTime()) - 24 * 60 * 60 * 1000);

const due = {
  reservations: () => prisma.reservation.findMany({
    where: { createdAt: { lt: before, lte: approvalCutoff }, status: "PENDING_APPROVAL" },
    select: { id: true },
  }),
  checkedIn: () => prisma.reservation.findMany({
    where: { createdAt: { lt: before }, status: "CHECKED_IN", checkedInAt: { not: null }, startDate: { lt: now } },
    select: { id: true },
  }),
  reviews: () => prisma.reservation.findMany({
    where: { createdAt: { lt: before }, status: "COMPLETED", completedAt: { lte: new Date(now.getTime() - 24 * 60 * 60 * 1000) }, OR: [{ reviewReminderSentAt: null }, { reviewReminderSentAt: { isSet: false } }] },
    select: { id: true },
  }),
  extensions: () => prisma.extensionRequest.findMany({ where: { createdAt: { lt: before }, status: "PENDING_PAYMENT", expiresAt: { lte: extensionCutoff } }, select: { id: true } }),
  charges: () => prisma.additionalCharge.findMany({ where: { createdAt: { lt: before, lte: chargeCutoff }, status: "PENDING_PAYMENT" }, select: { id: true } }),
  payouts: () => prisma.transaction.findMany({
    where: { createdAt: { lt: before }, status: "SUCCESS", payoutDueAt: { lte: now }, reservation: { is: { status: { in: ["COMPLETED", "NO_SHOW"] } } }, OR: [{ payoutDoneAt: null }, { payoutDoneAt: { isSet: false } }] },
    select: { id: true },
  }),
  invoices: () => prisma.invoice.findMany({ where: { createdAt: { lt: before }, invoiceUrl: { not: "" }, OR: [{ emailSentAt: null }, { emailSentAt: { isSet: false } }], status: { in: ["EMAIL_PENDING", "RETRYING", "EMAIL_FAILED"] } }, select: { id: true } }),
};

async function collect() {
  const [reservations, checkedIn, reviews, extensions, charges, payouts, invoices] = await Promise.all([
    due.reservations(), due.checkedIn(), due.reviews(), due.extensions(), due.charges(), due.payouts(), due.invoices(),
  ]);
  return { reservations, checkedIn, reviews, extensions, charges, payouts, invoices };
}

async function main() {
  const found = await collect();
  const counts = Object.fromEntries(Object.entries(found).map(([key, values]) => [key, values.length]));
  if (verify) {
    console.log(JSON.stringify({ mode: "verify", before: before.toISOString(), counts }));
    if (Object.values(counts).some((count) => count > 0)) process.exitCode = 1;
    return;
  }
  if (!execute) {
    console.log(JSON.stringify({ mode: "dry-run", before: before.toISOString(), counts, note: "No records changed" }));
    return;
  }

  const completedAt = new Date();
  const extensionIds = found.extensions.map(({ id }) => id);
  const chargeIds = found.charges.map(({ id }) => id);
  const [cancelledApprovals, autoCompleted, reviewClosed, expiredExtensions, expiredExtensionTransactions, cancelledCharges, expiredChargeTransactions, closedPayouts, sentInvoices] = await prisma.$transaction([
    prisma.reservation.updateMany({ where: { id: { in: found.reservations.map(({ id }) => id) } }, data: { status: "CANCELLED", isApproved: 3, rejectReason: "Closed by historical QStash cleanup" } }),
    prisma.reservation.updateMany({ where: { id: { in: found.checkedIn.map(({ id }) => id) } }, data: { status: "COMPLETED", isApproved: 1, completedAt } }),
    prisma.reservation.updateMany({ where: { id: { in: found.reviews.map(({ id }) => id) } }, data: { reviewReminderSentAt: completedAt, reviewReminderClaimedAt: null } }),
    prisma.extensionRequest.updateMany({ where: { id: { in: found.extensions.map(({ id }) => id) } }, data: { status: "EXPIRED", expiredAt: completedAt } }),
    prisma.transaction.updateMany({ where: { extensionRequestId: { in: extensionIds }, status: "PENDING" }, data: { status: "EXPIRED" } }),
    prisma.additionalCharge.updateMany({ where: { id: { in: found.charges.map(({ id }) => id) } }, data: { status: "CANCELLED", cancelledAt: completedAt, failureReason: "Closed by historical QStash cleanup" } }),
    prisma.transaction.updateMany({ where: { additionalChargeId: { in: chargeIds }, status: "PENDING" }, data: { status: "EXPIRED" } }),
    prisma.transaction.updateMany({ where: { id: { in: found.payouts.map(({ id }) => id) } }, data: { payoutSplitAt: completedAt, payoutDoneAt: completedAt } }),
    prisma.invoice.updateMany({ where: { id: { in: found.invoices.map(({ id }) => id) } }, data: { status: "EMAIL_SENT", emailSentAt: completedAt, emailError: null } }),
  ]);
  console.log(JSON.stringify({ mode: "execute", before: before.toISOString(), updated: { cancelledApprovals: cancelledApprovals.count, autoCompleted: autoCompleted.count, reviewClosed: reviewClosed.count, expiredExtensions: expiredExtensions.count, expiredExtensionTransactions: expiredExtensionTransactions.count, cancelledCharges: cancelledCharges.count, expiredChargeTransactions: expiredChargeTransactions.count, closedPayouts: closedPayouts.count, sentInvoices: sentInvoices.count } }));
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
