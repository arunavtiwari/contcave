import type { Page } from "@playwright/test";

import {
  createAdminUserFixture,
  createReviewListingFixture,
  createUserFixture,
  prisma,
} from "./support/db";
import { getE2EConnectionEnv } from "./support/env";
import { installServerOnlyStub } from "./support/server-only-stub";
import { expect, test } from "./support/test";
import { gotoApp } from "./support/ui";

installServerOnlyStub();

const THIRTY_ONE_DAYS_MS = 31 * 24 * 60 * 60 * 1000;

function previewLinks() {
  return require("../../lib/listing/preview") as typeof import("../../lib/listing/preview");
}

function adminBaseUrl() {
  const base = new URL(getE2EConnectionEnv().baseUrl);
  if (base.hostname === "localhost" || base.hostname === "127.0.0.1") {
    base.hostname = `admin.${base.hostname}`;
    return base.toString().replace(/\/$/, "");
  }

  if (base.hostname.startsWith("staging.")) {
    base.hostname = base.hostname.replace(/^staging\./, "staging.admin.");
    return base.toString().replace(/\/$/, "");
  }

  base.hostname = `admin.${base.hostname}`;
  return base.toString().replace(/\/$/, "");
}

async function loginAdmin(page: Page, email: string, password: string) {
  await gotoApp(page, `${adminBaseUrl()}/admin`);
  await page.getByLabel(/email address/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/admin\/dashboard\/listings/, { timeout: 60_000 });
}

function reviewButtonFor(page: Page, listingTitle: string) {
  return page.locator(`button[aria-label="Open listing details: ${listingTitle}"]`).first();
}

async function openReviewModal(page: Page, listingTitle: string) {
  const reviewButton = reviewButtonFor(page, listingTitle);
  await expect(reviewButton).toBeVisible({ timeout: 60_000 });

  const modal = page.getByTestId("admin-listing-review-modal");
  // Click the review button once
  await reviewButton.click();

  // Wait for the modal to be visible. If it doesn't open (due to click-before-hydration lag), click again.
  try {
    await modal.waitFor({ state: "visible", timeout: 5000 });
  } catch {
    // Retry clicking once
    await reviewButton.click();
    await modal.waitFor({ state: "visible", timeout: 15_000 });
  }
}

test.describe("admin listing moderation", () => {
  test("opens the Listings tab from the admin navigation", async ({ page }, testInfo) => {
    const { account } = await createAdminUserFixture(`navigation-r${testInfo.retry}`);

    await loginAdmin(page, account.email, account.password);
    await page.getByRole("link", { name: "Bookings" }).click();
    await expect(page).toHaveURL(/\/admin\/dashboard\/bookings/);
    await page.getByRole("link", { name: "Listings" }).click();
    await expect(page).toHaveURL(/\/admin\/dashboard\/listings/);
    await expect(page.getByRole("tablist", { name: "Listing status filters" })).toBeVisible();
  });

  test("loads status tabs and opens the enterprise review modal with KYC and documents", async ({ page }, testInfo) => {
    const { account } = await createAdminUserFixture(`review-open-r${testInfo.retry}`);
    const { user: owner } = await createUserFixture({
      role: "OWNER",
      verified: true,
      suffix: `review-owner-r${testInfo.retry}`,
    });
    const listing = await createReviewListingFixture({
      ownerId: owner.id,
      suffix: `open-r${testInfo.retry}`,
      status: "PENDING",
    });

    await loginAdmin(page, account.email, account.password);

    await expect(page.getByRole("tab", { name: /all/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /pending/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /verified/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /rejected/i })).toBeVisible();

    await openReviewModal(page, listing.title);
    const modal = page.getByTestId("admin-listing-review-modal");
    await expect(modal).toBeVisible();
    await expect(modal.getByText(listing.title)).toBeVisible();
    await expect(modal.getByText("KYC Verified").first()).toBeVisible();
    await expect(modal.getByText("Aadhaar OCR")).toBeVisible();
    await expect(modal.getByText("ownership-proof.pdf")).toBeVisible();
    await expect(modal.getByText("Signed agreement PDF")).toBeVisible();
    await expect(modal.getByText("QA Review Package")).toBeVisible();

    const preview = page.getByTestId("admin-review-open-preview");
    await expect(preview).toBeVisible();
    await expect(preview).toHaveAttribute("href", /\/studio\//);
    await expect(preview).not.toHaveAttribute("href", /admin\./);
    await expect(preview).toHaveAttribute("href", /[?&]preview=/);
    await expect(page.getByTestId("admin-review-approve")).toBeEnabled();
    await expect(page.getByTestId("admin-review-reject")).toBeEnabled();
  });

  test("shares a pending listing through a signed preview link that guests can open", async ({ page, browser }, testInfo) => {
    const { account } = await createAdminUserFixture(`preview-link-r${testInfo.retry}`);
    const { user: owner } = await createUserFixture({
      role: "OWNER",
      verified: true,
      suffix: `preview-owner-r${testInfo.retry}`,
    });
    const listing = await createReviewListingFixture({
      ownerId: owner.id,
      suffix: `preview-r${testInfo.retry}`,
      status: "PENDING",
    });

    await loginAdmin(page, account.email, account.password);
    await openReviewModal(page, listing.title);
    const previewUrl = await page.getByTestId("admin-review-open-preview").getAttribute("href");
    expect(previewUrl).toMatch(/[?&]preview=/);

    const guestContext = await browser.newContext();
    try {
      const guest = await guestContext.newPage();

      const shared = await guest.goto(previewUrl!);
      expect(shared?.status()).toBe(200);
      await expect(guest.getByText("Preview: this studio isn't live yet")).toBeVisible();
      await expect(guest.getByText(listing.title).first()).toBeVisible();

      const tampered = await guest.goto(previewUrl!.replace(/preview=[^&]+/, "preview=0.forged"));
      expect(tampered?.status()).toBe(404);

      const withoutToken = await guest.goto(previewUrl!.replace(/[?&]preview=[^&]+/, ""));
      expect(withoutToken?.status()).toBe(404);

      const expiredLink = previewLinks().listingShareLink(listing, Date.now() - THIRTY_ONE_DAYS_MS);
      const expired = await guest.goto(new URL(expiredLink.path, previewUrl!).toString());
      expect(expired?.status()).toBe(200);
      await expect(guest.getByText("This preview link has expired")).toBeVisible();
      await expect(guest.getByRole("link", { name: "Ask for a new link" })).toHaveAttribute("href", /wa\.me/);
    } finally {
      await guestContext.close();
    }
  });

  test("requires confirmation before approving a pending listing", async ({ page }, testInfo) => {
    const { account } = await createAdminUserFixture(`approve-r${testInfo.retry}`);
    const { user: owner } = await createUserFixture({
      role: "OWNER",
      verified: true,
      suffix: `approve-owner-r${testInfo.retry}`,
    });
    const listing = await createReviewListingFixture({
      ownerId: owner.id,
      suffix: `approve-r${testInfo.retry}`,
      status: "PENDING",
    });

    await loginAdmin(page, account.email, account.password);
    await openReviewModal(page, listing.title);
    await page.getByTestId("admin-review-approve").click();

    const confirm = page.getByTestId("admin-listing-confirm-modal");
    await expect(confirm).toBeVisible();
    await expect(confirm.getByText(/are you sure/i)).toBeVisible();
    await page.getByRole("button", { name: /^approve listing$/i }).click();

    await expect(confirm).toBeHidden({ timeout: 30_000 });
    const updated = await prisma.listing.findUnique({ where: { id: listing.id } });
    expect(updated?.status).toBe("VERIFIED");
    expect(updated?.active).toBe(true);
    expect(updated?.reviewedAt).toBeTruthy();
    expect(updated?.reviewedById).toBeTruthy();
    expect(updated?.rejectionReason).toBeNull();
  });

  test("requires a reason before rejecting a pending listing", async ({ page }, testInfo) => {
    const { account } = await createAdminUserFixture(`reject-r${testInfo.retry}`);
    const { user: owner } = await createUserFixture({
      role: "OWNER",
      verified: true,
      suffix: `reject-owner-r${testInfo.retry}`,
    });
    const listing = await createReviewListingFixture({
      ownerId: owner.id,
      suffix: `reject-r${testInfo.retry}`,
      status: "PENDING",
    });

    await loginAdmin(page, account.email, account.password);
    await openReviewModal(page, listing.title);
    await page.getByTestId("admin-review-reject").click();

    const confirm = page.getByTestId("admin-listing-confirm-modal");
    await expect(confirm).toBeVisible();
    await page.getByRole("button", { name: /^reject listing$/i }).click();
    await expect(page.getByText(/at least 10 characters/i)).toBeVisible();

    await page.getByLabel(/rejection reason/i).fill("Ownership proof is unclear and needs a clearer uploaded PDF.");
    await page.getByRole("button", { name: /^reject listing$/i }).click();

    await expect(confirm).toBeHidden({ timeout: 30_000 });
    const updated = await prisma.listing.findUnique({ where: { id: listing.id } });
    expect(updated?.status).toBe("REJECTED");
    expect(updated?.active).toBe(false);
    expect(updated?.reviewedAt).toBeTruthy();
    expect(updated?.reviewedById).toBeTruthy();
    expect(updated?.rejectionReason).toContain("Ownership proof");
  });
});
