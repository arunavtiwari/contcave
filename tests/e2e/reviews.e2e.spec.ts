import {
  createActiveListingFixture,
  createUserFixture,
  prisma,
  trackUserByEmail,
} from "./support/db";
import { expect, test } from "./support/test";
import { gotoApp, loginViaUi } from "./support/ui";

test.describe("customer review submission staging flow", () => {
  test("allows a customer with a completed booking to write and submit a studio review", async ({ page }, testInfo) => {
    test.setTimeout(180_000);
    const retrySuffix = `r${testInfo.retry}`;

    // 1. Create a verified owner and active listing
    const { user: owner } = await createUserFixture({
      role: "OWNER",
      verified: true,
      suffix: `rev-owner-${retrySuffix}`,
    });
    const listing = await createActiveListingFixture(owner.id, `rev-${retrySuffix}`);

    // 2. Create customer
    const { account: customerAccount, user: customer } = await createUserFixture({
      role: "CUSTOMER",
      verified: true,
      suffix: `rev-cust-${retrySuffix}`,
    });

    // 3. Insert a completed reservation directly into the DB
    const reservation = await prisma.reservation.create({
      data: {
        userId: customer.id,
        listingId: listing.id,
        bookingId: `CF-REV-${Date.now()}-${retrySuffix}`,
        startDate: new Date(),
        startTime: "10:00 AM",
        endTime: "11:00 AM",
        totalPrice: 2000,
        totalPriceInt: 2000,
        status: "COMPLETED",
      },
    });

    // 4. Log in customer and go to listing page
    await loginViaUi(page, customerAccount);
    await trackUserByEmail(customerAccount.email);
    
    await gotoApp(page, `/listings/${listing.id}`);

    // 5. Fill and submit the review
    const commentInput = page.locator("#review-comment");
    await expect(commentInput).toBeVisible({ timeout: 25_000 });
    
    const reviewText = `This studio space is absolutely fantastic! Highly recommended. (${retrySuffix})`;
    await commentInput.fill(reviewText);
    
    const submitBtn = page.getByTestId("review-submit-button");
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    // 6. Assert that the review comment is now displayed on the page
    await expect(page.getByText(reviewText)).toBeVisible({ timeout: 20_000 });

    // Clean up DB records
    await prisma.review.deleteMany({ where: { listingId: listing.id } });
    await prisma.reservation.delete({ where: { id: reservation.id } });
  });
});
