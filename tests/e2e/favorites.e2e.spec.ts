import {
  createActiveListingFixture,
  createUserFixture,
  trackUserByEmail,
} from "./support/db";
import { expect, test } from "./support/test";
import { gotoApp, loginViaUi } from "./support/ui";

test.describe("wishlist and favorites staging flow", () => {
  test("allows a customer to favorite and unfavorite a studio space listing", async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    const retrySuffix = `r${testInfo.retry}`;

    // 1. Create a verified host and active listing
    const { user: owner } = await createUserFixture({
      role: "OWNER",
      verified: true,
      suffix: `fav-owner-${retrySuffix}`,
    });
    const listing = await createActiveListingFixture(owner.id, `fav-${retrySuffix}`);

    // 2. Create customer and login
    const { account: customerAccount } = await createUserFixture({
      role: "CUSTOMER",
      verified: true,
      suffix: `fav-customer-${retrySuffix}`,
    });
    await loginViaUi(page, customerAccount);
    await trackUserByEmail(customerAccount.email);

    // 3. Visit listing details page and click the favorite button
    await gotoApp(page, `/listings/${listing.id}`);
    const heartBtn = page.getByTestId("heart-button").first();
    await expect(heartBtn).toBeVisible({ timeout: 15_000 });
    
    // Toggle favorite on
    await heartBtn.click();
    
    // 4. Navigate to My Favorites page and assert listing is visible
    await gotoApp(page, "/dashboard/favorites");
    await expect(page.getByText(listing.title)).toBeVisible({ timeout: 20_000 });

    // 5. Unfavorite from the dashboard listing card
    const dashboardHeartBtn = page.getByTestId("heart-button").first();
    await expect(dashboardHeartBtn).toBeVisible();
    await dashboardHeartBtn.click();

    // 6. Assert that it is removed from the wishlist page
    await expect(page.getByText(listing.title)).toBeHidden({ timeout: 15_000 });
  });
});
