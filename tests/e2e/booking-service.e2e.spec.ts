import { ReservationService } from "../../lib/reservation/service";
import { prisma, qaEmail, qaPhone } from "./support/db";
import { trackCreated } from "./support/run-state";
import { expect, test } from "./support/test";

type TransactionWithPayout = {
  payoutAmountToOwner: number | null;
};

function ymd(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
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
      actualLocation: { display_name: "Delhi" },
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

test.describe("booking service payment and payout state", () => {
  test("instant booking creates an approved reservation with exact owner payout scheduled", async () => {
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
    expect(txn.status).toBe("SUCCESS");
    expect(txn.vendorId).toBe(fixture.vendorId);
    expect(txn.payoutAmountToOwner).toBe(1060);
    expect(txn.payoutPercentToOwner).toBeCloseTo(89.83, 2);
    expect(txn.payoutDueAt).toBeInstanceOf(Date);
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
  });

  test("approval booking waits for host approval before scheduling owner payout", async () => {
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
    expect(txn.status).toBe("SUCCESS");
    expect(txn.vendorId).toBe(fixture.vendorId);
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

    await ReservationService.updateStatus(pendingReservation.id, fixture.owner.id, 1);

    const approvedReservation = await prisma.reservation.findUniqueOrThrow({
      where: { id: pendingReservation.id },
      include: { Transaction: true },
    });
    txn = withPayoutFields(approvedReservation.Transaction[0]);

    expect(approvedReservation.isApproved).toBe(1);
    expect(txn.payoutAmountToOwner).toBe(1060);
    expect(txn.payoutDueAt).toBeInstanceOf(Date);
    expect(txn.payoutDoneAt).toBeNull();

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

    expect(pendingInvoiceCount).toBe(1);
    expect(pendingReceiptCount).toBe(1);
  });

  test("approval booking rejection refunds against receipt without creating a tax invoice", async () => {
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

    await ReservationService.updateStatus(pendingReservation.id, fixture.owner.id, 2, "QA rejection");

    const rejectedReservation = await prisma.reservation.findUniqueOrThrow({
      where: { id: pendingReservation.id },
      include: { Transaction: true },
    });
    const txn = rejectedReservation.Transaction[0];

    expect(rejectedReservation.isApproved).toBe(2);
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
  });

  test("customer cancellation while approval is pending refunds and closes the receipt", async () => {
    const fixture = await createServiceFlowFixture({
      instantBooking: false,
      suffix: `cancel-${Date.now()}`,
    });

    const result = await ReservationService.createFromTransaction(fixture.transaction.id);
    const reservationId = result!.reservationId;
    trackCreated("reservation", reservationId);

    await ReservationService.updateStatus(reservationId, fixture.customer.id, 3);

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
  });

  test("24-hour pending approval expiry refunds, releases slots, and never creates an invoice", async () => {
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
    expect(expired.isApproved).toBe(2);
    expect(expired.rejectReason).toMatch(/did not respond within 24 hours/i);
    expect(expired.Transaction[0].status).toBe("REFUNDED");
    expect(await prisma.reservationSlot.count({ where: { reservationId } })).toBe(0);
    expect(await prisma.invoice.count({ where: { reservationId } })).toBe(0);
    expect(await prisma.paymentVoucher.count({
      where: { reservationId, voucherType: "REFUND_VOUCHER" },
    })).toBe(1);
  });
});
