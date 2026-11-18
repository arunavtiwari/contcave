import type { Page } from "@playwright/test";

import { createGuestDocumentsFixture, createStaffUserFixture, createUserFixture, prisma, qaAccount, waitForUserByEmail } from "./support/db";
import { installServerOnlyStub } from "./support/server-only-stub";
import { expect, test } from "./support/test";
import { adminBaseUrl, gotoApp, loginAdmin } from "./support/ui";

installServerOnlyStub();

const BOOKINGS = /\/admin\/dashboard\/bookings/;

/** Fetches from inside the page so the request carries its session and resolves admin.localhost. */
function documentResponse(page: Page, path: string) {
  return page.evaluate(async (url) => {
    const response = await fetch(url, { redirect: "manual" });
    return { type: response.type, status: response.status };
  }, path);
}

/** Signs in with credentials from inside the page, for accounts the admin login form refuses. */
function signInInPage(page: Page, email: string, password: string) {
  return page.evaluate(async ({ email, password }) => {
    const { csrfToken } = (await (await fetch("/api/auth/csrf")).json()) as { csrfToken: string };
    await fetch("/api/auth/callback/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ csrfToken, email, password }),
      redirect: "manual",
    });
  }, { email, password });
}

/** A tab on the Bookings page; the sidebar also has a "Bookings" link, so look inside the page content. */
const bookingTab = (page: Page, name: string) => page.getByRole("main").getByRole("link", { name: new RegExp(`^${name}`) });

test.describe("finance staff", () => {
  test("sees only the bookings area, read-only", async ({ page }, testInfo) => {
    const { account } = await createStaffUserFixture("FINANCE", `area-r${testInfo.retry}`);

    await loginAdmin(page, account.email, account.password, BOOKINGS);

    const nav = page.getByRole("navigation");
    await expect(nav.getByRole("link", { name: "Bookings" })).toBeVisible();
    for (const hidden of ["Listings", "Owners", "Users", "Job Logs"]) {
      await expect(nav.getByRole("link", { name: hidden })).toHaveCount(0);
    }

    for (const visible of ["Owner Invoices", "Receipts & Refunds", "Payouts"]) {
      await expect(bookingTab(page, visible)).toBeVisible();
    }
    for (const hidden of ["Failures", "Document Audit"]) {
      await expect(bookingTab(page, hidden)).toHaveCount(0);
    }
    await expect(page.getByRole("button", { name: "Create Booking" })).toHaveCount(0);
  });

  test("is sent back to bookings from every other admin page", async ({ page }, testInfo) => {
    const { account } = await createStaffUserFixture("FINANCE", `blocked-r${testInfo.retry}`);
    await loginAdmin(page, account.email, account.password, BOOKINGS);

    for (const path of ["listings", "owners", "users", "logs", "bookings?tab=audit"]) {
      await gotoApp(page, `${adminBaseUrl()}/admin/dashboard/${path}`);
      await expect(page, path).toHaveURL(BOOKINGS);
    }
    await expect(bookingTab(page, "Document Audit")).toHaveCount(0);
  });

  test("role changes apply on the next page load, without signing in again", async ({ page }, testInfo) => {
    const { account, user } = await createStaffUserFixture("FINANCE", `role-change-r${testInfo.retry}`);
    await loginAdmin(page, account.email, account.password, BOOKINGS);
    const usersPage = `${adminBaseUrl()}/admin/dashboard/users`;

    await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
    await gotoApp(page, usersPage);
    await expect(page).toHaveURL(/\/admin\/dashboard\/users/);
    await expect(page.getByRole("button", { name: "Add staff" })).toBeVisible();

    await prisma.user.update({ where: { id: user.id }, data: { role: "CUSTOMER" } });
    await page.goto(usersPage);
    await expect(page).not.toHaveURL(/\/admin\/dashboard/);
  });

  test("can download booking documents that other users can't", async ({ page, browser }, testInfo) => {
    const suffix = `docs-r${testInfo.retry}`;
    const { user: guest } = await createUserFixture({ role: "CUSTOMER", suffix: `guest-${suffix}` });
    const { invoice, voucher } = await createGuestDocumentsFixture(guest.id, suffix);
    const invoicePath = `/api/documents/invoices/${invoice.id}?download=1`;
    const voucherPath = `/api/documents/vouchers/${voucher.id}?download=1`;

    const { account: finance } = await createStaffUserFixture("FINANCE", suffix);
    await loginAdmin(page, finance.email, finance.password, BOOKINGS);
    // The fixture PDFs live at an external URL, so an allowed request answers with a redirect to it.
    for (const path of [invoicePath, voucherPath]) {
      expect((await documentResponse(page, path)).type, path).toBe("opaqueredirect");
    }

    const { account: stranger } = await createUserFixture({ role: "OWNER", suffix: `stranger-${suffix}` });
    const strangerContext = await browser.newContext();
    const strangerPage = await strangerContext.newPage();
    await gotoApp(strangerPage, `${adminBaseUrl()}/admin`);
    await signInInPage(strangerPage, stranger.email, stranger.password);
    for (const path of [invoicePath, voucherPath]) {
      expect((await documentResponse(strangerPage, path)).status, path).toBe(404);
    }
    await strangerContext.close();
  });

  test("customers can't sign in to the admin panel", async ({ page }, testInfo) => {
    const { account } = await createUserFixture({ role: "CUSTOMER", suffix: `admin-login-r${testInfo.retry}` });
    await gotoApp(page, `${adminBaseUrl()}/admin`);
    await page.getByLabel(/email address/i).fill(account.email);
    await page.getByLabel(/password/i).fill(account.password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByRole("alert").filter({ hasText: /invalid email or password/i })).toBeVisible();
    await expect(page).not.toHaveURL(/\/admin\/dashboard/);
  });
});

test.describe("admin bookings", () => {
  test("renders every operations tab and opens a booking's details", async ({ page }, testInfo) => {
    const { account } = await createStaffUserFixture("ADMIN", `bookings-r${testInfo.retry}`);
    await loginAdmin(page, account.email, account.password);
    await gotoApp(page, `${adminBaseUrl()}/admin/dashboard/bookings`);
    await expect(page.getByRole("button", { name: "Create Booking" })).toBeVisible();

    for (const tab of ["Owner Invoices", "Receipts & Refunds", "Payouts", "Failures", "Document Audit", "Bookings"]) {
      await bookingTab(page, tab).click();
      await expect(page.getByRole("table").or(page.getByText(/^No .+ (yet|found)/i)).first(), tab).toBeVisible();
    }

    const details = page.getByRole("button", { name: "View booking details" }).first();
    // Wait past the loading placeholders: real rows, or the empty message.
    await expect(details.or(page.getByText(/^No .+ (yet|found)/i)).first()).toBeVisible({ timeout: 30_000 });
    test.skip((await details.count()) === 0, "Needs at least one booking in the test database");
    await details.click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });
});

test.describe("admin user management", () => {
  test("adds a finance user, promotes them and removes their access", async ({ page }, testInfo) => {
    const suffix = `users-r${testInfo.retry}`;
    const { account: admin } = await createStaffUserFixture("ADMIN", suffix);
    const invitee = qaAccount("customer", `invitee-${suffix}`);

    await loginAdmin(page, admin.email, admin.password);
    await page.getByRole("navigation").getByRole("link", { name: "Users" }).click();
    await expect(page).toHaveURL(/\/admin\/dashboard\/users/);

    const addButton = page.getByRole("button", { name: "Add staff" });
    const dialogName = page.getByLabel("Name");
    await addButton.click();
    if (!(await dialogName.isVisible())) await addButton.click();
    await dialogName.fill(invitee.name);
    await page.getByLabel("Email").fill(invitee.email);
    await page.getByRole("button", { name: "Add staff" }).last().click();
    await expect(page.getByText(`Added ${invitee.email}.`, { exact: false })).toBeVisible({ timeout: 30_000 });
    const invited = await waitForUserByEmail(invitee.email);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: invited.id } })).role).toBe("FINANCE");

    await page.getByRole("searchbox", { name: "Search users" }).fill(invitee.email);
    await page.getByRole("searchbox", { name: "Search users" }).press("Enter");
    const row = page.getByTestId("user-row").filter({ hasText: invitee.email });
    await expect(row.getByText("Finance")).toBeVisible();
    await expect(row.getByText("Invite pending")).toBeVisible();

    await row.getByRole("button", { name: "Make admin" }).click();
    await page.getByRole("button", { name: "Confirm" }).click();
    await expect.poll(async () => (await prisma.user.findUniqueOrThrow({ where: { id: invited.id } })).role).toBe("ADMIN");

    await row.getByRole("button", { name: "Remove staff access" }).click();
    await page.getByRole("button", { name: "Confirm" }).click();
    await expect.poll(async () => (await prisma.user.findUniqueOrThrow({ where: { id: invited.id } })).role).toBe("CUSTOMER");
  });

  test("offers no role changes on the signed-in admin's own row", async ({ page }, testInfo) => {
    const { account: admin } = await createStaffUserFixture("ADMIN", `self-r${testInfo.retry}`);
    await loginAdmin(page, admin.email, admin.password);
    await gotoApp(page, `${adminBaseUrl()}/admin/dashboard/users?q=${encodeURIComponent(admin.email)}`);

    const row = page.getByTestId("user-row").filter({ hasText: admin.email });
    await expect(row.getByText("(you)")).toBeVisible();
    await expect(row.getByRole("button")).toHaveCount(0);
  });
});
