import {
  createActiveListingFixture,
  createUserFixture,
  prisma,
  trackUserByEmail,
} from "./support/db";
import { expect, test } from "./support/test";
import { gotoApp, loginViaUi } from "./support/ui";

test.describe("real-time chat staging flow", () => {
  test("allows customer and host to exchange messages on a reservation chat room", async ({ browser, page }, testInfo) => {
    test.setTimeout(180_000);
    const retrySuffix = `r${testInfo.retry}`;

    // 1. Create verified host, active listing, and verified customer
    const { account: ownerAccount, user: owner } = await createUserFixture({
      role: "OWNER",
      verified: true,
      suffix: `chat-owner-${retrySuffix}`,
    });
    const listing = await createActiveListingFixture(owner.id, `chat-${retrySuffix}`);

    const { account: customerAccount, user: customer } = await createUserFixture({
      role: "CUSTOMER",
      verified: true,
      suffix: `chat-customer-${retrySuffix}`,
    });

    // 2. Insert a confirmed reservation directly into the DB to bypass gateway UI checkout lag
    const reservation = await prisma.reservation.create({
      data: {
        userId: customer.id,
        listingId: listing.id,
        bookingId: `CF-CHAT-${Date.now()}-${retrySuffix}`,
        startDate: new Date(),
        startTime: "10:00 AM",
        endTime: "12:00 PM",
        totalPrice: 3000,
        totalPriceInt: 3000,
        status: "CONFIRMED",
      },
    });

    // 3. Log in as Customer and send a message
    await loginViaUi(page, customerAccount);
    await trackUserByEmail(customerAccount.email);
    
    await gotoApp(page, `/dashboard/chat/${reservation.id}`);
    
    const customerInput = page.getByTestId("chat-input");
    const customerSendBtn = page.getByTestId("chat-send-button");
    
    await expect(customerInput).toBeVisible({ timeout: 20_000 });
    const msgFromCustomer = `Hello host, is parking available? (${retrySuffix})`;
    await customerInput.fill(msgFromCustomer);
    await customerSendBtn.click();
    
    // Assert message appears on screen for Customer
    await expect(page.getByText(msgFromCustomer)).toBeVisible({ timeout: 10_000 });

    // 4. Log in as Host in a separate browser context and read/reply
    const ownerContext = await browser.newContext();
    const ownerPage = await ownerContext.newPage();
    
    await loginViaUi(ownerPage, ownerAccount);
    await gotoApp(ownerPage, `/dashboard/chat/${reservation.id}`);
    
    // Assert Customer's message is visible to Host
    await expect(ownerPage.getByText(msgFromCustomer)).toBeVisible({ timeout: 20_000 });
    
    // Host replies
    const hostInput = ownerPage.getByTestId("chat-input");
    const hostSendBtn = ownerPage.getByTestId("chat-send-button");
    
    await expect(hostInput).toBeVisible();
    const msgFromHost = `Yes, we have 2 dedicated slots for you. (${retrySuffix})`;
    await hostInput.fill(msgFromHost);
    await hostSendBtn.click();
    
    // Assert message appears on screen for Host
    await expect(ownerPage.getByText(msgFromHost)).toBeVisible({ timeout: 10_000 });
    
    // 5. Verify the reply appears on the Customer's page in real-time
    await expect(page.getByText(msgFromHost)).toBeVisible({ timeout: 20_000 });
    
    // Clean up Host context
    await ownerPage.close();
    await ownerContext.close();

    // Clean up DB records via tracking
    await prisma.reservation.delete({ where: { id: reservation.id } });
  });
});
