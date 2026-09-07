import { createUserFixture, trackUserByEmail } from "./support/db";
import { expect, test } from "./support/test";
import { gotoApp, loginViaUi } from "./support/ui";

test.describe("Payment Details Form E2E Tests", () => {
  test("allows studio owner to save and modify bank and tax payment details cleanly", async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    const retrySuffix = `r${testInfo.retry}`;

    // 1. Create a verified studio owner user
    const { account: ownerAccount } = await createUserFixture({
      role: "OWNER",
      verified: true,
      suffix: `pay-owner-${retrySuffix}`,
    });
    await loginViaUi(page, ownerAccount);
    await trackUserByEmail(ownerAccount.email);

    // 2. Navigate to payments dashboard
    await gotoApp(page, "/dashboard/payments");

    // 3. Switch to Payment Details tab
    const paymentTab = page.getByRole("tab", { name: "Payment Details" });
    await expect(paymentTab).toBeVisible({ timeout: 15_000 });
    await paymentTab.click();

    // 4. Click Modify button to enable form fields
    const modifyBtn = page.getByRole("button", { name: "Modify" });
    await expect(modifyBtn).toBeVisible({ timeout: 15_000 });
    await modifyBtn.click();

    // 5. Fill out bank details
    await page.fill("#accountHolderName", "Test Owner Name");
    await page.fill("#bankName", "HDFC Bank");
    await page.fill("#accountNumber", "98765432101");
    await page.fill("#reAccountNumber", "98765432101");
    await page.fill("#ifscCode", "HDFC0001234");
    await page.fill("#companyName", "Contcave Studios Pvt Ltd");
    // Leave GSTIN empty intentionally to test optional handling

    // 6. Save details
    const saveBtn = page.getByRole("button", { name: "Save" });
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();

    // 7. Verify toast success
    await expect(page.getByText("Payment details saved successfully")).toBeVisible({ timeout: 15_000 });

    // 8. Re-open form with "Modify" to verify no GSTIN error occurs when saved unedited
    await expect(modifyBtn).toBeVisible({ timeout: 15_000 });
    await modifyBtn.click();

    // Change only bank name and save again
    await page.fill("#bankName", "ICICI Bank");
    await saveBtn.click();

    // 9. Confirm save succeeds without any GSTIN validation error
    await expect(page.getByText("Payment details saved successfully")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Invalid GSTIN format")).toBeHidden();
  });
});
