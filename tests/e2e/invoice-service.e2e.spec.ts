import { generateInvoicePDFBlob } from "../../lib/invoice/pdfBlob";
import { InvoiceService } from "../../lib/invoice/service";
import { prisma, qaEmail, qaPhone } from "./support/db";
import { trackCreated } from "./support/run-state";
import { expect, test } from "./support/test";

process.env.E2E_DISABLE_R2_UPLOAD = "true";
process.env.E2E_DISABLE_EMAIL_SEND = "true";
process.env.E2E_DISABLE_PDF_RENDER = "true";

function ymd(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

async function createInvoiceFixture(params: {
  suffix: string;
  ownerHasGst: boolean;
  bookingDate?: Date;
}) {
  const owner = await prisma.user.create({
    data: {
      name: `QA invoice owner ${params.suffix}`,
      email: qaEmail("owner", `invoice-owner-${params.suffix}`),
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
      name: `QA invoice customer ${params.suffix}`,
      email: qaEmail("customer", `invoice-customer-${params.suffix}`),
      phone: qaPhone("customer"),
      role: "CUSTOMER",
    },
  });
  trackCreated("user", customer.id);

  const billing = await prisma.billingDetails.create({
    data: {
      userId: customer.id,
      companyName: `QA Customer Pvt Ltd ${params.suffix}`,
      gstin: "29ABCDE1234F1Z5",
      billingAddress: "QA Billing Address, Bengaluru, Karnataka",
      isDefault: true,
    },
  });
  trackCreated("billingDetails", billing.id);

  if (params.ownerHasGst) {
    const paymentDetails = await prisma.paymentDetails.create({
      data: {
        userId: owner.id,
        accountHolderName: "QA Owner",
        bankName: "QA Bank",
        accountNumber: "1234567890",
        ifscCode: "HDFC0001234",
        companyName: `QA GST Studio LLP ${params.suffix}`,
        gstin: "29ABCDE1234F1Z5",
        cashfreeVendorId: `qa_invoice_vendor_${params.suffix}`,
      },
    });
    trackCreated("paymentDetails", paymentDetails.id);
  }

  const listing = await prisma.listing.create({
    data: {
      slug: `qa-invoice-studio-${params.suffix}`.toLowerCase(),
      title: `QA Invoice Studio ${params.suffix}`,
      description: "<p>QA invoice test studio</p>",
      imageSrc: ["https://assets.contcave.com/e2e/placeholder-studio.png"],
      category: "Indoor Studio",
      locationValue: "Delhi",
      actualLocation: { display_name: "New Delhi, Delhi", state: "Delhi" },
      propertyStateCode: "07",
      price: 1000,
      userId: owner.id,
      amenities: [],
      otherAmenities: [],
      addons: [],
      operationalDays: { start: "Mon", end: "Sun" },
      operationalHours: { start: "9:00 AM", end: "9:00 PM" },
      minimumBookingHours: 1,
      maximumPax: 10,
      instantBooking: true,
      type: ["Photography"],
      terms: true,
      status: "VERIFIED",
      active: true,
      hasSets: false,
      setsHaveSamePrice: false,
    },
  });
  trackCreated("listing", listing.id);

  const startDate = params.bookingDate || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  const reservation = await prisma.reservation.create({
    data: {
      userId: customer.id,
      listingId: listing.id,
      billingDetailId: billing.id,
      bookingId: `BKG-${params.suffix}`.slice(0, 16).toUpperCase(),
      startDate,
      startTime: "11:00 AM",
      endTime: "1:00 PM",
      totalPrice: 1180,
      totalPriceInt: 1180,
      isApproved: 1,
    },
  });
  trackCreated("reservation", reservation.id);

  const transaction = await prisma.transaction.create({
    data: {
      userId: customer.id,
      listingId: listing.id,
      reservationId: reservation.id,
      bookingId: reservation.bookingId,
      amount: 1180,
      currency: "INR",
      status: "SUCCESS",
      description: "QA invoice payment",
      paymentMethod: "Cashfree",
      cfTxnRef: `qa_invoice_txn_${params.suffix}`,
      cfOrderId: `qa_invoice_order_${params.suffix}`,
      gstOwnedBy: params.ownerHasGst ? "STUDIO" : "ARKANET",
      baseAmountBeforeGst: 1000,
      payoutAmountToOwner: params.ownerHasGst ? 1060 : 880,
      payoutPercentToOwner: params.ownerHasGst ? 89.83 : 74.58,
      metadata: {
        startDate: ymd(startDate),
        startTime: "11:00 AM",
        endTime: "1:00 PM",
        selectedAddons: [],
        instantBooking: true,
        setIds: [],
      },
    },
  });
  trackCreated("transaction", transaction.id);

  return { owner, customer, listing, reservation, transaction };
}

test.describe("enterprise invoice service", () => {
  test("concurrent customer invoice generation is idempotent and stores one invoice", async () => {
    const fixture = await createInvoiceFixture({
      suffix: `cust-${Date.now()}`,
      ownerHasGst: true,
    });

    const results = await Promise.all([
      InvoiceService.ensureCustomerInvoiceForTransaction(fixture.transaction.id),
      InvoiceService.ensureCustomerInvoiceForTransaction(fixture.transaction.id),
    ]);
    results.forEach((result) => trackCreated("invoice", result.invoice.id));

    expect(results[0].invoice.id).toBe(results[1].invoice.id);
    expect(results[0].invoice.invoiceNumber).toBe(results[1].invoice.invoiceNumber);
    expect(results[0].invoice.documentType).toBe("CUSTOMER_STUDIO_TAX_INVOICE");
    expect(results[0].invoice.invoiceNumber).toMatch(/^ST[A-F0-9]{4}-2627-\d{3,}$/);
    expect(results[0].invoice.igstAmount).toBe(180);
    expect(results[0].invoice.cgstAmount).toBe(0);
    expect(results[0].invoice.sgstAmount).toBe(0);
    expect(results[0].invoice.invoiceUrl).toContain("assets.contcave.com/e2e/invoices");

    const invoiceCount = await prisma.invoice.count({
      where: { transactionId: fixture.transaction.id },
    });
    expect(invoiceCount).toBe(1);

    const lockCount = await prisma.invoiceIdempotencyLock.count({
      where: { idempotencyKey: `CUSTOMER_STUDIO_TAX_INVOICE:${fixture.transaction.id}` },
    });
    expect(lockCount).toBe(1);
  });

  test("non-GST customer invoice is issued by ContCave in CC series", async () => {
    const fixture = await createInvoiceFixture({
      suffix: `principal-${Date.now()}`,
      ownerHasGst: false,
    });

    const result = await InvoiceService.ensureCustomerInvoiceForTransaction(fixture.transaction.id);
    trackCreated("invoice", result.invoice.id);

    expect(result.invoice.documentType).toBe("CUSTOMER_ARKANET_TAX_INVOICE");
    expect(result.invoice.issuerType).toBe("ARKANET");
    expect(result.invoice.invoiceNumber).toMatch(/^CC-2627-\d{3,}$/);
    expect(result.invoice.igstAmount).toBe(180);
    expect(result.invoice.cgstAmount).toBe(0);
    expect(result.invoice.sgstAmount).toBe(0);
  });

  test("monthly owner invoice reruns reuse the same invoice and month-end issued date", async () => {
    const monthEnd = new Date("2026-07-31T18:20:00.000Z"); // 31 Jul 2026 23:50 IST
    const monthStart = new Date("2026-06-30T18:30:00.000Z"); // 1 Jul 2026 00:00 IST
    const fixture = await createInvoiceFixture({
      suffix: `month-${Date.now()}`,
      ownerHasGst: true,
      bookingDate: new Date("2026-07-15T05:30:00.000Z"),
    });

    const first = await InvoiceService.ensureMonthlyOwnerInvoice({
      ownerId: fixture.owner.id,
      periodStart: monthStart,
      periodEnd: monthEnd,
      documentType: "OWNER_MONTHLY_COMMISSION_INVOICE",
    });
    const second = await InvoiceService.ensureMonthlyOwnerInvoice({
      ownerId: fixture.owner.id,
      periodStart: monthStart,
      periodEnd: monthEnd,
      documentType: "OWNER_MONTHLY_COMMISSION_INVOICE",
    });

    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    trackCreated("invoice", first!.invoice.id);
    trackCreated("invoice", second!.invoice.id);

    expect(first!.invoice.id).toBe(second!.invoice.id);
    expect(first!.invoice.documentType).toBe("OWNER_MONTHLY_COMMISSION_INVOICE");
    expect(first!.invoice.invoiceNumber).toMatch(/^CCM-2627-\d{3,}$/);
    expect(first!.invoice.igstAmount).toBe(21.6);
    expect(first!.invoice.cgstAmount).toBe(0);
    expect(first!.invoice.sgstAmount).toBe(0);
    expect(first!.invoice.issuedAt?.toISOString()).toBe(monthEnd.toISOString());
    expect(first!.invoice.periodStart?.toISOString()).toBe(monthStart.toISOString());
    expect(first!.invoice.periodEnd?.toISOString()).toBe(monthEnd.toISOString());

    const invoiceCount = await prisma.invoice.count({
      where: {
        userId: fixture.owner.id,
        documentType: "OWNER_MONTHLY_COMMISSION_INVOICE",
        periodStart: monthStart,
        periodEnd: monthEnd,
      },
    });
    expect(invoiceCount).toBe(1);
  });

  test("non-GST owner bill of supply is generated without tax invoice commission type", async () => {
    const fixture = await createInvoiceFixture({
      suffix: `nongst-${Date.now()}`,
      ownerHasGst: false,
      bookingDate: new Date("2026-07-20T05:30:00.000Z"),
    });

    const statement = await InvoiceService.ensureMonthlyOwnerInvoice({
      ownerId: fixture.owner.id,
      periodStart: new Date("2026-06-30T18:30:00.000Z"),
      periodEnd: new Date("2026-07-31T18:20:00.000Z"),
      documentType: "OWNER_MONTHLY_BILL_OF_SUPPLY",
    });

    expect(statement).not.toBeNull();
    trackCreated("invoice", statement!.invoice.id);
    expect(statement!.invoice.documentType).toBe("OWNER_MONTHLY_BILL_OF_SUPPLY");
    expect(statement!.invoice.invoiceNumber).toMatch(/^BOS[A-F0-9]{4}-2627-\d{3,}$/);
    expect(statement!.invoice.gstAmount).toBe(0);
    expect(JSON.stringify(statement!.invoice.lineItems)).not.toMatch(/TDS|194C|194H|Form 16A/i);
  });

  test("PDF generation rejects forbidden TDS wording", async () => {
    await expect(generateInvoicePDFBlob({
      documentType: "OWNER_MONTHLY_BILL_OF_SUPPLY",
      invoiceNumber: "QA-TEST",
      invoiceDate: new Date(),
      billedBy: { name: "QA Studio" },
      billedTo: { name: "ContCave" },
      lineItems: [{ description: "Studio service", taxableValue: 100 }],
      amount: 100,
      gstAmount: 0,
      totalAmount: 100,
      notes: ["This note mentions TDS and must fail."],
    })).rejects.toThrow(/TDS/i);
  });
});
