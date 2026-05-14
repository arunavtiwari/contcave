import { expect, type Page, test } from "@playwright/test";

import {
  createAdminUserFixture,
  createReviewListingFixture,
  createUserFixture,
  prisma,
} from "./support/db";
import { getE2EConnectionEnv } from "./support/env";

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
  await page.goto(`${adminBaseUrl()}/admin`);
  await page.getByLabel(/email address/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/admin\/dashboard\/listings/);
}

test.describe("admin listing moderation", () => {
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

    const reviewButton = page.getByTestId(`review-listing-${listing.id}`);
    await expect(reviewButton).toBeVisible({ timeout: 60_000 });
    await reviewButton.click();
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
    await expect(preview).toHaveAttribute("href", /\/listings\//);
    await expect(preview).not.toHaveAttribute("href", /admin\./);
    await expect(page.getByTestId("admin-review-approve")).toBeEnabled();
    await expect(page.getByTestId("admin-review-reject")).toBeEnabled();
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
    await page.getByTestId(`review-listing-${listing.id}`).click();
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
    await page.getByTestId(`review-listing-${listing.id}`).click();
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
