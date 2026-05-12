import { expect, test } from "@playwright/test";

import { assertOwnerFullyVerified, createUserFixture, qaAccount, waitForUserByEmail } from "./support/db";
import { completeOwnerVerification, loginViaUi, registerOwnerViaUi } from "./support/ui";

test.describe.configure({ mode: "serial" });

test.describe("owner verification staging flow", () => {
  test("registers a fresh owner and completes email, phone, Aadhaar OCR, and bank verification", async ({ page }) => {
    test.setTimeout(240_000);

    const owner = qaAccount("owner", "provider");

    await registerOwnerViaUi(page, owner);
    const user = await waitForUserByEmail(owner.email);

    await completeOwnerVerification(page, owner);

    await assertOwnerFullyVerified(user.id);
    await expect(page.getByText(/profile verified/i)).toBeVisible({ timeout: 30_000 });
  });

  test("blocks incomplete verification progression and surfaces invalid input failures", async ({ page }) => {
    const { account } = await createUserFixture({
      role: "OWNER",
      verified: false,
      suffix: "verification-negative",
    });

    await loginViaUi(page, account);
    await page.goto("/dashboard/profile");
    await page.getByRole("button", { name: /start verification/i }).click();

    const modal = page.getByTestId("verification-modal");
    await expect(modal).toBeVisible();

    await modal.getByTestId("verification-modal-primary-action").click();
    await expect(page.getByText(/please verify email first/i)).toBeVisible();

    await modal.locator("#email").fill("not-an-email");
    await modal.getByRole("button", { name: /^verify$/i }).nth(0).click();
    await expect(page.getByText(/email verification failed/i)).toBeVisible();
  });
});
