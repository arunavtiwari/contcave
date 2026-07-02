import {
  createActiveListingFixture,
  createUserFixture,
  prisma,
  qaAccount,
  trackUserByEmail,
  waitForReservation,
  waitForUserByEmail,
} from "./support/db";
import { expect, test } from "./support/test";
import { completeCashfreeCheckout, loginViaUi, registerCustomerViaUi } from "./support/ui";

test.describe.configure({ mode: "serial" });

function formatYmd(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

async function selectFirstBookableSlot(page: import("@playwright/test").Page) {
  const now = new Date();
  const targetDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  await page.locator(".rdrCalendarWrapper").waitFor({ state: "visible" });

  if (targetDate.getMonth() !== now.getMonth()) {
    const nextMonthBtn = page.locator(".rdrNextButton");
    if (await nextMonthBtn.isVisible()) {
      await nextMonthBtn.click();
      await page.waitForTimeout(500);
    }
  }

  const targetDay = String(targetDate.getDate());
  const day = page
    .locator(".rdrDay:not(.rdrDayPassive)")
    .filter({ has: page.getByText(targetDay, { exact: true }) })
    .first();

  await day.click();
  await expect(page.getByRole("button", { name: /^11:00 AM$/i })).toBeEnabled();
  await page.getByRole("button", { name: /^11:00 AM$/i }).click();
  await page.getByRole("button", { name: /^1:00 PM$/i }).click();
}

async function acceptBookingSummary(page: import("@playwright/test").Page) {
  const summary = page.getByTestId("booking-summary-modal");
  await expect(summary).toBeVisible();
  await summary.locator('input[type="checkbox"]').last().check();
  await summary.getByTestId("booking-summary-modal-primary-action").click();
}

test.describe("booking staging flow", () => {
  test("books an active studio through Cashfree sandbox and creates a reservation from webhook", async ({ browser, page }, testInfo) => {
    test.setTimeout(360_000);
    const retrySuffix = `r${testInfo.retry}`;

    const { account: ownerAccount, user: owner } = await createUserFixture({
      role: "OWNER",
      verified: true,
      suffix: `booking-owner-${retrySuffix}`,
    });
    const listing = await createActiveListingFixture(owner.id, `booking-${retrySuffix}`);
    const customer = qaAccount("customer", `booking-${retrySuffix}`);

    await registerCustomerViaUi(page, customer);
    const customerUser = await waitForUserByEmail(customer.email);

    await page.goto(`/listings/${listing.id}`);
    await selectFirstBookableSlot(page);
    await page.getByRole("button", { name: /reserve and pay/i }).click();

    const phoneModal = page.getByTestId("phone-modal");
    if (await phoneModal.isVisible().catch(() => false)) {
      await phoneModal.locator("#phone-modal-input").fill(customer.phone);
      await phoneModal.getByTestId("phone-modal-primary-action").click();
    }

    await acceptBookingSummary(page);
    await completeCashfreeCheckout(page);

    const reservation = await waitForReservation({
      userId: customerUser.id,
      listingId: listing.id,
    });
    expect(reservation.isApproved).toBe(1);
    expect(reservation.totalPrice).toBeGreaterThan(0);
    expect(reservation.Transaction[0]?.status).toBe("SUCCESS");

    const duplicate = await page.request.post("/api/payments/cashfree/process", {
      data: {
        listingId: listing.id,
        startDate: formatYmd(reservation.startDate),
        startTime: reservation.startTime,
        endTime: reservation.endTime,
        totalPrice: reservation.totalPrice,
        selectedAddons: [],
        instantBooking: true,
      },
    });
    expect(duplicate.status()).toBe(400);
    await expect(duplicate.json()).resolves.toMatchObject({ success: false });

    await page.goto("/dashboard/bookings");
    await expect(page.getByText(listing.title)).toBeVisible({ timeout: 30_000 });

    const ownerPage = await browser.newPage();
    await loginViaUi(ownerPage, ownerAccount);
    await ownerPage.goto("/dashboard/reservations");
    await expect(ownerPage.getByText(listing.title)).toBeVisible({ timeout: 30_000 });
    await ownerPage.close();
  });

  test("blocks unauthenticated booking by opening login", async ({ page }, testInfo) => {
    const { user: owner } = await createUserFixture({
      role: "OWNER",
      verified: true,
      suffix: `booking-auth-owner-r${testInfo.retry}`,
    });
    const listing = await createActiveListingFixture(owner.id, `unauthenticated-r${testInfo.retry}`);

    await page.goto(`/listings/${listing.id}`);
    await selectFirstBookableSlot(page);
    await page.getByRole("button", { name: /reserve and pay/i }).click();
    await expect(page.getByTestId("login-modal")).toBeVisible();
  });

  test("rejects addon over-quantity and inactive listing payments before Cashfree order creation", async ({ page }, testInfo) => {
    const { account: customerAccount } = await createUserFixture({
      role: "CUSTOMER",
      verified: false,
      suffix: `booking-negative-customer-r${testInfo.retry}`,
    });
    const { user: owner } = await createUserFixture({
      role: "OWNER",
      verified: true,
      suffix: `booking-negative-owner-r${testInfo.retry}`,
    });
    const listing = await createActiveListingFixture(owner.id, `negative-r${testInfo.retry}`);

    await loginViaUi(page, customerAccount);
    await trackUserByEmail(customerAccount.email);

    const overQuantity = await page.request.post("/api/payments/cashfree/process", {
      data: {
        listingId: listing.id,
        startDate: formatYmd(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
        startTime: "9:00 AM",
        endTime: "11:00 AM",
        totalPrice: 1,
        selectedAddons: [{ name: "QA Smoke Machine", price: 250, qty: 2 }],
        instantBooking: true,
      },
    });
    expect(overQuantity.status()).toBe(400);
    await expect(overQuantity.json()).resolves.toMatchObject({
      success: false,
      error: expect.stringContaining("only has 1 available"),
    });

    await prisma.listing.update({ where: { id: listing.id }, data: { active: false } });
    const inactiveListing = await page.request.post("/api/payments/cashfree/process", {
      data: {
        listingId: listing.id,
        startDate: formatYmd(new Date(Date.now() + 8 * 24 * 60 * 60 * 1000)),
        startTime: "9:00 AM",
        endTime: "11:00 AM",
        totalPrice: 1,
        selectedAddons: [],
        instantBooking: true,
      },
    });
    expect(inactiveListing.status()).toBe(400);
    await expect(inactiveListing.json()).resolves.toMatchObject({
      success: false,
      error: "This listing is currently not accepting bookings",
    });
  });
});
