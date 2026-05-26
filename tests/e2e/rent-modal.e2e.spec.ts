import { createUserFixture, prisma, waitForListingByTitle } from "./support/db";
import { expect, test } from "./support/test";
import { createListingViaRentModal, loginViaUi, openUserMenu, selectAddressOption, selectReactOption } from "./support/ui";

test.describe.configure({ mode: "serial" });

function hasPersistedFileObject(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(hasPersistedFileObject);

  const record = value as Record<string, unknown>;
  if ("file" in record) return true;
  return Object.values(record).some(hasPersistedFileObject);
}

test.describe("rent modal staging flow", () => {
  test("creates a pending listing with uploads, addon, package, verification document, and JSON-safe metadata", async ({ page }, testInfo) => {
    const { account } = await createUserFixture({
      role: "OWNER",
      verified: true,
      suffix: `rent-happy-r${testInfo.retry}`,
    });
    const listingTitle = `${account.name} Studio`;

    await loginViaUi(page, account);
    await createListingViaRentModal(page, listingTitle);

    const listing = await waitForListingByTitle(listingTitle);
    const packages = await prisma.package.findMany({ where: { listingId: listing.id } });

    expect(listing.status).toBe("PENDING");
    expect(listing.active).toBe(false);
    expect(listing.imageSrc.length).toBeGreaterThan(0);
    expect(String(listing.imageSrc[0])).toContain("users/");
    expect(listing.verifications).toBeTruthy();
    expect(hasPersistedFileObject(listing.verifications)).toBe(false);
    expect(Array.isArray(listing.addons)).toBe(true);
    expect(packages.length).toBe(1);
  });

  test("blocks invalid rent modal progression for missing category, address, and image", async ({ page }, testInfo) => {
    const { account } = await createUserFixture({
      role: "OWNER",
      verified: true,
      suffix: `rent-negative-r${testInfo.retry}`,
    });

    await loginViaUi(page, account);
    await page.goto("/");
    await openUserMenu(page);
    await page.getByText("List your space").click();
    await expect(page.getByTestId("rent-modal-step-category")).toBeVisible();

    await page.getByTestId("rent-modal-primary-action").click();
    await expect(page.getByText(/please select a category/i)).toBeVisible();

    await page.getByRole("button", { name: /indoor studio/i }).click();
    await page.getByTestId("rent-modal-primary-action").click();
    await selectReactOption(page, "input#city-select", "Delhi", "Delhi");
    await page.getByTestId("rent-modal-primary-action").click();
    await expect(page.getByText(/please enter a complete address/i)).toBeVisible();

    await selectAddressOption(page, "Connaught Place New Delhi", /connaught|new delhi|delhi/i);
    await page.getByTestId("rent-modal-primary-action").click();
    await expect(page.getByTestId("rent-modal-step-images")).toBeVisible();
    await page.getByTestId("rent-modal-primary-action").click();
    await expect(page.getByText(/please upload at least one image/i)).toBeVisible();
  });
});
