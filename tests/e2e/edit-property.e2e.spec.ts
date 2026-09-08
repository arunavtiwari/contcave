import { createActiveListingFixture, createUserFixture, prisma } from "./support/db";
import { expect, test } from "./support/test";
import { gotoApp, loginViaUi } from "./support/ui";

async function waitForEditedListing(params: {
  listingId: string;
  title: string;
  price: number;
  maximumPax: number;
}) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 60_000) {
    const listing = await prisma.listing.findUnique({
      where: { id: params.listingId },
      include: { packages: true },
    });

    if (
      listing?.title === params.title &&
      listing.price === params.price &&
      listing.maximumPax === params.maximumPax &&
      listing.packages.length === 1 &&
      listing.packages[0].title === "QA Edit Package"
    ) {
      return listing;
    }

    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }

  throw new Error(`Timed out waiting for edited listing ${params.listingId}`);
}

test.describe("edit property flow", () => {
  test("saves changed fields and package, then skips a no-op save", async ({ page }, testInfo) => {
    const mediaUploadErrors: string[] = [];
    page.on("console", (message) => {
      const text = message.text();
      if (message.type() === "error" && text.includes("Failed to parse string into File")) {
        mediaUploadErrors.push(text);
      }
    });

    const { account, user } = await createUserFixture({
      role: "OWNER",
      verified: true,
      suffix: `edit-property-r${testInfo.retry}`,
    });
    const listing = await createActiveListingFixture(user.id, `edit-property-r${testInfo.retry}`);
    const updatedTitle = `${account.name} Edited Studio`;

    await loginViaUi(page, account);
    await gotoApp(page, `/dashboard/properties/${listing.id}`);

    await expect(page.getByRole("heading", { name: /edit property/i })).toBeVisible({ timeout: 30_000 });

    await page.locator("#listingName").fill(updatedTitle);
    await page.locator("#listingPrice").fill("1750");
    await page.locator("#maximumPax").fill("18");

    await page.getByRole("button", { name: /add new package/i }).click();
    await page.locator("#title-0").fill("QA Edit Package");
    await page.locator("#duration-0").fill("3");
    await page.locator("#original-0").fill("4500");
    await page.locator("#offered-0").fill("3900");
    await page.locator("#new-feature-0").fill("Edited package feature");
    await page.keyboard.press("Enter");

    await page.getByRole("button", { name: /^save$/i }).click();
    await expect(page.getByText(/property updated successfully/i)).toBeVisible({ timeout: 60_000 });

    const saved = await waitForEditedListing({
      listingId: listing.id,
      title: updatedTitle,
      price: 1750,
      maximumPax: 18,
    });

    expect(saved.packages[0].offeredPrice).toBe(3900);
    expect(saved.packages[0].features).toContain("Edited package feature");
    expect(saved.addons).toEqual(listing.addons);

    await page.getByRole("button", { name: /^save$/i }).click();
    await expect(page.getByText(/no changes to save/i)).toBeVisible({ timeout: 30_000 });

    const packageCount = await prisma.package.count({ where: { listingId: listing.id } });
    expect(packageCount).toBe(1);
    expect(mediaUploadErrors).toEqual([]);
  });
});
