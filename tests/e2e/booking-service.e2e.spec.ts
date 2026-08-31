import { scheduleQstashJob } from "../../lib/cron/qstash";
import { prisma, qaEmail, qaPhone } from "./support/db";
import { getE2EConnectionEnv } from "./support/env";
import { trackCreated } from "./support/run-state";
import { installServerOnlyStub } from "./support/server-only-stub";
import { expect, test } from "./support/test";

type TransactionWithPayout = {
  payoutAmountToOwner: number | null;
};

installServerOnlyStub();
process.env.E2E_DISABLE_R2_UPLOAD = "true";
process.env.E2E_DISABLE_EMAIL_SEND = "true";

async function getReservationService() {
  const module = require("../../lib/reservation/service") as typeof import("../../lib/reservation/service");
  return module.ReservationService;
}

async function getPostBookingService() {
  const module = require("../../lib/post-booking/service") as typeof import("../../lib/post-booking/service");
  return module.PostBookingService;
}

async function getReviewReminderService() {
  const module = require("../../lib/review/reminders") as typeof import("../../lib/review/reminders");
  return module.ReviewReminderService;
}

function ymd(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function istDateParts(date: Date) {
  const ist = new Date(date.getTime() + 330 * 60 * 1000);
  return {
    year: ist.getUTCFullYear(),
    month: ist.getUTCMonth() + 1,
    day: ist.getUTCDate(),
    hour: ist.getUTCHours(),
    minute: ist.getUTCMinutes(),
  };
}

function istDateOnly(date: Date) {
  const parts = istDateParts(date);
  return new Date(`${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}T00:00:00.000Z`);
}

async function createServiceFlowFixture(params: { instantBooking: boolean; suffix: string }) {
  const owner = await prisma.user.create({
    data: {
      name: `QA service owner ${params.suffix}`,
      email: qaEmail("owner", `service-${params.suffix}`),
      phone: qaPhone("owner"),
      role: "OWNER",
      is_verified: true,
      bank_verified: true,
      phone_verified: true,
      email_verified: true,
      verification_stage: 3,
    },
  });
  trackCreated("user", owner.id);

  const customer = await prisma.user.create({
    data: {
      name: `QA service customer ${params.suffix}`,
      email: qaEmail("customer", `service-${params.suffix}`),
      phone: qaPhone("customer"),
      role: "CUSTOMER",
    },
  });
  trackCreated("user", customer.id);

  const paymentDetails = await prisma.paymentDetails.create({
    data: {
      userId: owner.id,
      accountHolderName: "QA Owner",
      bankName: "QA Bank",
      accountNumber: "1234567890",
      ifscCode: "HDFC0001234",
      companyName: "QA Studio LLP",
      gstin: "29ABCDE1234F1Z5",
      cashfreeVendorId: `qa_vendor_${params.suffix}`,
    },
  });
  trackCreated("paymentDetails", paymentDetails.id);

  const listing = await prisma.listing.create({
    data: {
      slug: `qa-service-flow-${params.suffix}`.toLowerCase(),
      title: `QA Service Studio ${params.suffix}`,
      description: "<p>QA service flow listing</p>",
      imageSrc: ["https://assets.contcave.com/e2e/placeholder-studio.png"],
      category: "Indoor Studio",
      locationValue: "Delhi",
      actualLocation: { display_name: "Delhi", propertyStateCode: "07" },
      propertyStateCode: "07",
      price: 1500,
      userId: owner.id,
      amenities: [],
      otherAmenities: [],
      addons: [],
      operationalDays: { start: "Mon", end: "Sun" },
      operationalHours: { start: "9:00 AM", end: "9:00 PM" },
      minimumBookingHours: 2,
      maximumPax: 10,
      instantBooking: params.instantBooking,
      type: ["Fashion Shoot"],
      terms: true,
      status: "VERIFIED",
      active: true,
      hasSets: false,
      setsHaveSamePrice: false,
    },
  });
  trackCreated("listing", listing.id);

  const startDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  const transaction = await prisma.transaction.create({
    data: {
      userId: customer.id,
      listingId: listing.id,
      amount: 1180,
      currency: "INR",
      status: "PENDING",
      description: "QA successful payment",
      paymentMethod: "Cashfree",
      cfTxnRef: `qa_txn_${params.suffix}`,
      cfOrderId: `qa_order_${params.suffix}`,
      metadata: {
        startDate: ymd(startDate),
        startTime: "11:00 AM",
        endTime: "1:00 PM",
        selectedAddons: [],
        instantBooking: params.instantBooking,
        setIds: [],
      },
    },
  });
  trackCreated("transaction", transaction.id);

  return { owner, customer, transaction, vendorId: `qa_vendor_${params.suffix}` };
}

function withPayoutFields<T extends object>(transaction: T): T & TransactionWithPayout {
  return transaction as T & TransactionWithPayout;
}

async function waitForReservationStatus(reservationId: string, status: string, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      select: { status: true },
    });
    if (reservation?.status === status) return reservation;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for reservation ${reservationId} to reach ${status}`);
}

async function waitForRefundVoucher(reservationId: string, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const voucher = await prisma.paymentVoucher.findFirst({
      where: { reservationId, voucherType: "REFUND_VOUCHER" },
      select: { id: true },
    });
    if (voucher) return voucher;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for refund voucher for reservation ${reservationId}`);
}

async function warmQstashDispatcher() {
  const { baseUrl } = getE2EConnectionEnv();
  const response = await fetch(`${baseUrl}/api/cron/qstash`);

  // The route accepts signed POSTs only. A 405 proves that the dispatcher is
  // compiled and reachable before local QStash attempts its first delivery.
  if (response.status !== 405) {
    throw new Error(`QStash dispatcher warm-up returned ${response.status}`);
  }
}

test.describe("booking service payment and payout state", () => {
  test("instant booking creates a confirmed reservation without scheduling payout before completion", async () => {
    const ReservationService = await getReservationService();
    const fixture = await createServiceFlowFixture({
      instantBooking: true,
      suffix: `instant-${Date.now()}`,
    });

    const result = await ReservationService.createFromTransaction(fixture.transaction.id);
    expect(result?.created).toBe(true);
    expect(result?.isInstant).toBe(true);

    const reservation = await prisma.reservation.findUniqueOrThrow({
      where: { id: result!.reservationId },
      include: { Transaction: true },
    });
    trackCreated("reservation", reservation.id);

    const txn = withPayoutFields(reservation.Transaction[0]);
    expect(reservation.isApproved).toBe(1);
    expect(reservation.status).toBe("CONFIRMED");
    expect(txn.status).toBe("SUCCESS");
    expect(txn.vendorId).toBeNull();
    expect(txn.payoutAmountToOwner).toBe(1060);
    expect(txn.payoutPercentToOwner).toBeCloseTo(89.83, 2);
    expect(txn.payoutDueAt).toBeNull();
    expect(txn.payoutDoneAt).toBeNull();

    const [invoiceCount, receiptCount] = await Promise.all([
      prisma.invoice.count({
        where: {
          reservationId: reservation.id,
          documentType: { in: ["CUSTOMER_STUDIO_TAX_INVOICE", "CUSTOMER_ARKANET_TAX_INVOICE"] },
        },
      }),
      prisma.paymentVoucher.count({
        where: { reservationId: reservation.id, voucherType: "RECEIPT_VOUCHER" },
      }),
    ]);

    expect(invoiceCount).toBe(1);
    expect(receiptCount).toBe(0);
    const invoice = await prisma.invoice.findFirst({
      where: { reservationId: reservation.id, documentType: { in: ["CUSTOMER_STUDIO_TAX_INVOICE", "CUSTOMER_ARKANET_TAX_INVOICE"] } },
      orderBy: { createdAt: "desc" },
    });
    expect(invoice?.invoiceUrl).toMatch(/^https:\/\//);
    expect(invoice?.status).toBe("EMAIL_SENT");
  });

  test("approval booking waits for check-in and completion before scheduling owner payout", async () => {
    const ReservationService = await getReservationService();
    const fixture = await createServiceFlowFixture({
      instantBooking: false,
      suffix: `approval-${Date.now()}`,
    });

    const result = await ReservationService.createFromTransaction(fixture.transaction.id);
    expect(result?.created).toBe(true);
    expect(result?.isInstant).toBe(false);

    const pendingReservation = await prisma.reservation.findUniqueOrThrow({
      where: { id: result!.reservationId },
      include: { Transaction: true },
    });
    trackCreated("reservation", pendingReservation.id);

    let txn = withPayoutFields(pendingReservation.Transaction[0]);
    expect(pendingReservation.isApproved).toBe(0);
    expect(pendingReservation.status).toBe("PENDING_APPROVAL");
    expect(txn.status).toBe("SUCCESS");
    expect(txn.vendorId).toBeNull();
    expect(txn.payoutAmountToOwner).toBe(1060);
    expect(txn.payoutDueAt).toBeNull();

    let [pendingInvoiceCount, pendingReceiptCount] = await Promise.all([
      prisma.invoice.count({
        where: {
          reservationId: pendingReservation.id,
          documentType: { in: ["CUSTOMER_STUDIO_TAX_INVOICE", "CUSTOMER_ARKANET_TAX_INVOICE"] },
        },
      }),
      prisma.paymentVoucher.count({
        where: { reservationId: pendingReservation.id, voucherType: "RECEIPT_VOUCHER" },
      }),
    ]);

    expect(pendingInvoiceCount).toBe(0);
    expect(pendingReceiptCount).toBe(1);
    const pendingReceipt = await prisma.paymentVoucher.findFirst({
      where: { reservationId: pendingReservation.id, voucherType: "RECEIPT_VOUCHER" },
      orderBy: { createdAt: "desc" },
    });
    expect(pendingReceipt?.voucherUrl).toMatch(/^https:\/\//);
    expect(pendingReceipt?.status).toBe("EMAIL_SENT");

    await ReservationService.updateStatus(pendingReservation.id, fixture.owner.id, "CONFIRMED");

    const approvedReservation = await prisma.reservation.findUniqueOrThrow({
      where: { id: pendingReservation.id },
      include: { Transaction: true },
    });
    txn = withPayoutFields(approvedReservation.Transaction[0]);

    expect(approvedReservation.isApproved).toBe(1);
    expect(approvedReservation.status).toBe("CONFIRMED");
    expect(txn.payoutAmountToOwner).toBe(1060);
    expect(txn.payoutDueAt).toBeNull();
    expect(txn.payoutDoneAt).toBeNull();

    // Keep the auto-complete job in the future while exercising check-in with a
    // deterministic clock; otherwise local QStash can correctly complete a
    // historical test booking before the host completes the flow below.
    const today = istDateParts(new Date(Date.now() + 24 * 60 * 60 * 1000));
    const activeWindow = new Date(
      `${today.year}-${String(today.month).padStart(2, "0")}-${String(today.day).padStart(2, "0")}T06:00:00+05:30`,
    );
    const activeStartTime = "5:45 AM";
    const activeEndTime = "6:45 AM";
    const extensionEndTime = "7:15 AM";
    await prisma.reservation.update({
      where: { id: approvedReservation.id },
      data: {
        startDate: istDateOnly(activeWindow),
        startTime: activeStartTime,
        endTime: activeEndTime,
      },
    });

    await ReservationService.checkIn(approvedReservation.id, fixture.owner.id, { now: activeWindow });

    const PostBookingService = await getPostBookingService();
    const extension = await prisma.extensionRequest.create({
      data: {
        reservationId: approvedReservation.id,
        durationMinutes: 30,
        oldEndTime: activeEndTime,
        requestedEndTime: extensionEndTime,
        extraAmount: 590,
        listingRateAtTime: 1500,
        paymentTokenHash: `qa_extension_${Date.now()}`,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });
    const extensionTransaction = await prisma.transaction.create({
      data: {
        userId: fixture.customer.id,
        reservationId: approvedReservation.id,
        listingId: approvedReservation.listingId,
        bookingId: approvedReservation.bookingId,
        amount: 590,
        status: "SUCCESS",
        purpose: "EXTENSION",
        extensionRequestId: extension.id,
        description: "QA extension payment",
        paymentMethod: "Cashfree",
        cfTxnRef: `qa_ext_${Date.now()}`,
        cfOrderId: `qa_ext_order_${Date.now()}`,
        metadata: { reservationId: approvedReservation.id, extensionRequestId: extension.id },
      },
    });
    trackCreated("transaction", extensionTransaction.id);
    await PostBookingService.applyExtensionPayment(extensionTransaction.id);

    const appliedExtension = await prisma.extensionRequest.findUniqueOrThrow({ where: { id: extension.id } });
    const extendedReservation = await prisma.reservation.findUniqueOrThrow({ where: { id: approvedReservation.id } });
    expect(appliedExtension.status).toBe("PAID");
    expect(extendedReservation.endTime).toBe(extensionEndTime);

    const charge = await prisma.additionalCharge.create({
      data: {
        reservationId: approvedReservation.id,
        type: "SERVICE",
        items: [{ name: "Extra lighting", qty: 1, unitPrice: 590 }],
        totalAmount: 590,
        paymentTokenHash: `qa_charge_${Date.now()}`,
      },
    });
    const chargeTransaction = await prisma.transaction.create({
      data: {
        userId: fixture.customer.id,
        reservationId: approvedReservation.id,
        listingId: approvedReservation.listingId,
        bookingId: approvedReservation.bookingId,
        amount: 590,
        status: "SUCCESS",
        purpose: "ADDITIONAL_CHARGE",
        additionalChargeId: charge.id,
        description: "QA service charge",
        paymentMethod: "Cashfree",
        cfTxnRef: `qa_charge_${Date.now()}`,
        cfOrderId: `qa_charge_order_${Date.now()}`,
        metadata: { reservationId: approvedReservation.id, additionalChargeId: charge.id, type: "SERVICE" },
      },
    });
    trackCreated("transaction", chargeTransaction.id);
    await PostBookingService.applyAdditionalChargePayment(chargeTransaction.id);

    const appliedCharge = await prisma.additionalCharge.findUniqueOrThrow({ where: { id: charge.id } });
    const appliedChargeTransaction = await prisma.transaction.findUniqueOrThrow({ where: { id: chargeTransaction.id } });
    expect(appliedCharge.status).toBe("PAID");
    expect(appliedChargeTransaction.status).toBe("SUCCESS");
    expect(appliedChargeTransaction.payoutDueAt).toBeInstanceOf(Date);

    await ReservationService.complete(approvedReservation.id, fixture.owner.id);

    const completedReservation = await prisma.reservation.findUniqueOrThrow({
      where: { id: pendingReservation.id },
      include: { Transaction: true },
    });
    txn = withPayoutFields(completedReservation.Transaction[0]);

    expect(completedReservation.status).toBe("COMPLETED");
    expect(completedReservation.checkedInAt).toBeInstanceOf(Date);
    expect(completedReservation.completedAt).toBeInstanceOf(Date);
    expect(txn.payoutAmountToOwner).toBe(1060);
    expect(txn.payoutDueAt).toBeInstanceOf(Date);
    expect(txn.payoutDoneAt).toBeNull();

    const extensionTransactionAfterCompletion = await prisma.transaction.findUniqueOrThrow({ where: { id: extensionTransaction.id } });
    expect(extensionTransactionAfterCompletion.payoutDueAt).toBeInstanceOf(Date);

    [pendingInvoiceCount, pendingReceiptCount] = await Promise.all([
      prisma.invoice.count({
        where: {
          reservationId: pendingReservation.id,
          documentType: { in: ["CUSTOMER_STUDIO_TAX_INVOICE", "CUSTOMER_ARKANET_TAX_INVOICE"] },
        },
      }),
      prisma.paymentVoucher.count({
        where: { reservationId: pendingReservation.id, voucherType: "RECEIPT_VOUCHER" },
      }),
    ]);

    expect(pendingInvoiceCount).toBe(3);
    expect(pendingReceiptCount).toBe(1);
    const bookingInvoices = await prisma.invoice.findMany({
      where: { reservationId: pendingReservation.id, documentType: { in: ["CUSTOMER_STUDIO_TAX_INVOICE", "CUSTOMER_ARKANET_TAX_INVOICE"] } },
      orderBy: { createdAt: "asc" },
    });
    expect(bookingInvoices).toHaveLength(3);
    for (const invoice of bookingInvoices) {
      expect(invoice.invoiceUrl).toMatch(/^https:\/\//);
      expect(invoice.status).toBe("EMAIL_SENT");
    }

    await prisma.reservation.update({
      where: { id: pendingReservation.id },
      data: { completedAt: new Date(Date.now() - 25 * 60 * 60 * 1000) },
    });
    const ReviewReminderService = await getReviewReminderService();
    const reminders = await Promise.all([
      ReviewReminderService.sendForReservation(pendingReservation.id),
      ReviewReminderService.sendForReservation(pendingReservation.id),
    ]);
    expect(reminders.filter((result) => result.status === "sent")).toHaveLength(1);
    const remindedReservation = await prisma.reservation.findUniqueOrThrow({ where: { id: pendingReservation.id } });
    expect(remindedReservation.reviewReminderSentAt).toBeInstanceOf(Date);
  });

  test("approval booking rejection refunds against receipt without creating a tax invoice", async () => {
    const ReservationService = await getReservationService();
    const fixture = await createServiceFlowFixture({
      instantBooking: false,
      suffix: `reject-${Date.now()}`,
    });

    const result = await ReservationService.createFromTransaction(fixture.transaction.id);
    expect(result?.created).toBe(true);

    const pendingReservation = await prisma.reservation.findUniqueOrThrow({
      where: { id: result!.reservationId },
      include: { Transaction: true },
    });
    trackCreated("reservation", pendingReservation.id);

    expect(pendingReservation.isApproved).toBe(0);
    expect(await prisma.paymentVoucher.count({
      where: { reservationId: pendingReservation.id, voucherType: "RECEIPT_VOUCHER" },
    })).toBe(1);
    expect(await prisma.invoice.count({
      where: {
        reservationId: pendingReservation.id,
        documentType: { in: ["CUSTOMER_STUDIO_TAX_INVOICE", "CUSTOMER_ARKANET_TAX_INVOICE"] },
      },
    })).toBe(0);

    await ReservationService.updateStatus(pendingReservation.id, fixture.owner.id, "CANCELLED", "QA rejection");

    const rejectedReservation = await prisma.reservation.findUniqueOrThrow({
      where: { id: pendingReservation.id },
      include: { Transaction: true },
    });
    const txn = rejectedReservation.Transaction[0];

    expect(rejectedReservation.isApproved).toBe(3);
    expect(rejectedReservation.status).toBe("CANCELLED");
    expect(txn.status).toBe("REFUNDED");
    expect(txn.payoutDueAt).toBeNull();
    expect(await prisma.reservationSlot.count({ where: { reservationId: pendingReservation.id } })).toBe(0);
    expect(await prisma.invoice.count({
      where: {
        reservationId: pendingReservation.id,
        documentType: { in: ["CUSTOMER_STUDIO_TAX_INVOICE", "CUSTOMER_ARKANET_TAX_INVOICE"] },
      },
    })).toBe(0);
    expect(await prisma.paymentVoucher.count({
      where: { reservationId: pendingReservation.id, voucherType: "REFUND_VOUCHER" },
    })).toBe(1);
    const rejectionRefundVoucher = await prisma.paymentVoucher.findFirst({
      where: { reservationId: pendingReservation.id, voucherType: "REFUND_VOUCHER" },
      orderBy: { createdAt: "desc" },
    });
    expect(rejectionRefundVoucher?.voucherUrl).toMatch(/^https:\/\//);
    expect(rejectionRefundVoucher?.status).toBe("EMAIL_SENT");
  });

  test("customer cancellation while approval is pending refunds and closes the receipt", async () => {
    const ReservationService = await getReservationService();
    const fixture = await createServiceFlowFixture({
      instantBooking: false,
      suffix: `cancel-${Date.now()}`,
    });

    const result = await ReservationService.createFromTransaction(fixture.transaction.id);
    const reservationId = result!.reservationId;
    trackCreated("reservation", reservationId);

    await ReservationService.updateStatus(reservationId, fixture.customer.id, "CANCELLED");

    const cancelled = await prisma.reservation.findUniqueOrThrow({
      where: { id: reservationId },
      include: { Transaction: true },
    });
    expect(cancelled.isApproved).toBe(3);
    expect(cancelled.Transaction[0].status).toBe("REFUNDED");
    expect(await prisma.reservationSlot.count({ where: { reservationId } })).toBe(0);
    expect(await prisma.invoice.count({ where: { reservationId } })).toBe(0);
    expect(await prisma.paymentVoucher.count({
      where: { reservationId, voucherType: "REFUND_VOUCHER" },
    })).toBe(1);
    const cancellationRefundVoucher = await prisma.paymentVoucher.findFirst({
      where: { reservationId, voucherType: "REFUND_VOUCHER" },
      orderBy: { createdAt: "desc" },
    });
    expect(cancellationRefundVoucher?.voucherUrl).toMatch(/^https:\/\//);
    expect(cancellationRefundVoucher?.status).toBe("EMAIL_SENT");
  });

  test("24-hour pending approval expiry refunds, releases slots, and never creates an invoice", async () => {
    const ReservationService = await getReservationService();
    const fixture = await createServiceFlowFixture({
      instantBooking: false,
      suffix: `timeout-${Date.now()}`,
    });

    const result = await ReservationService.createFromTransaction(fixture.transaction.id);
    const reservationId = result!.reservationId;
    trackCreated("reservation", reservationId);

    const expiryResults = await ReservationService.expirePendingApprovalReservations(
      new Date(Date.now() + 25 * 60 * 60 * 1000),
      reservationId
    );
    expect(expiryResults).toContainEqual({ id: reservationId, status: "expired" });

    const expired = await prisma.reservation.findUniqueOrThrow({
      where: { id: reservationId },
      include: { Transaction: true },
    });
    expect(expired.isApproved).toBe(3);
    expect(expired.status).toBe("CANCELLED");
    expect(expired.rejectReason).toMatch(/did not respond within 24 hours/i);
    expect(expired.Transaction[0].status).toBe("REFUNDED");
    expect(await prisma.reservationSlot.count({ where: { reservationId } })).toBe(0);
    expect(await prisma.invoice.count({ where: { reservationId } })).toBe(0);
    expect(await prisma.paymentVoucher.count({
      where: { reservationId, voucherType: "REFUND_VOUCHER" },
    })).toBe(1);
    const expiryRefundVoucher = await prisma.paymentVoucher.findFirst({
      where: { reservationId, voucherType: "REFUND_VOUCHER" },
      orderBy: { createdAt: "desc" },
    });
    expect(expiryRefundVoucher?.voucherUrl).toMatch(/^https:\/\//);
    expect(expiryRefundVoucher?.status).toBe("EMAIL_SENT");
  });

  test("historical terminal status makes an otherwise-due booking a no-op", async () => {
    const ReservationService = await getReservationService();
    const fixture = await createServiceFlowFixture({
      instantBooking: false,
      suffix: `terminal-${Date.now()}`,
    });

    const result = await ReservationService.createFromTransaction(fixture.transaction.id);
    const reservationId = result!.reservationId;
    trackCreated("reservation", reservationId);
    await prisma.reservation.update({
      where: { id: reservationId },
      data: { status: "CANCELLED", isApproved: 3, rejectReason: "Historical job cleanup" },
    });

    const expiryResults = await ReservationService.expirePendingApprovalReservations(
      new Date(Date.now() + 25 * 60 * 60 * 1000),
      reservationId,
    );
    expect(expiryResults).toEqual([]);

    const unchanged = await prisma.reservation.findUniqueOrThrow({
      where: { id: reservationId },
      include: { Transaction: true },
    });
    expect(unchanged.status).toBe("CANCELLED");
    expect(unchanged.Transaction[0].status).toBe("SUCCESS");
    expect(await prisma.paymentVoucher.count({
      where: { reservationId, voucherType: "REFUND_VOUCHER" },
    })).toBe(0);
  });

  test("local QStash delivers a signed expiry job to the application dispatcher", async () => {
    const ReservationService = await getReservationService();
    const fixture = await createServiceFlowFixture({
      instantBooking: false,
      suffix: `qstash-${Date.now()}`,
    });

    const result = await ReservationService.createFromTransaction(fixture.transaction.id);
    const reservationId = result!.reservationId;
    trackCreated("reservation", reservationId);

    await prisma.reservation.update({
      where: { id: reservationId },
      data: { createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000) },
    });

    await warmQstashDispatcher();
    const message = await scheduleQstashJob(
      { job: "pending-approval-expiry", reservationId },
      new Date(),
    );
    expect(message).not.toBeNull();

    await waitForReservationStatus(reservationId, "CANCELLED", 60_000);
    await expect(waitForRefundVoucher(reservationId, 60_000)).resolves.toBeTruthy();
  });
});
