import { createUserFixture } from "./support/db";
import { expect, test } from "./support/test";
import { gotoApp, loginViaUi, openUserMenu, seedCookieConsent } from "./support/ui";

const VIEWPORTS = [
  { name: "phone", width: 375, height: 812 },
  { name: "desktop", width: 1440, height: 900 },
] as const;

for (const viewport of VIEWPORTS) {
  test.describe(`navbar menus (${viewport.name})`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test("the user menu works by keyboard and renders outside the navbar", async ({ page }) => {
      await seedCookieConsent(page);
      await gotoApp(page, "/");
      const trigger = page.getByRole("button", { name: "Open user menu" });

      await trigger.focus();
      await page.keyboard.press("Enter");
      const menu = page.getByRole("menu");
      await expect(menu).toBeVisible();
      await expect(page.getByRole("menuitem", { name: "Login" })).toBeFocused();

      await page.keyboard.press("ArrowDown");
      await expect(page.getByRole("menuitem", { name: "Sign up" })).toBeFocused();

      // Portalled to <body>, outside the navbar's own blur, so the glass blurs the page behind it.
      expect(await menu.evaluate((element) => Boolean(element.closest("nav, header")))).toBe(false);

      await page.keyboard.press("Escape");
      await expect(menu).toBeHidden();
      await expect(trigger).toBeFocused();
    });

    test("the studio sort menu picks an order by keyboard or pointer", async ({ page }) => {
      await seedCookieConsent(page);
      await gotoApp(page, "/studios");
      const trigger = page.getByRole("button", { name: /^Sort:|Recommended|↑|↓/ }).first();

      await trigger.click();
      const lowToHigh = page.getByRole("menuitemradio", { name: /price: low to high/i });
      await expect(lowToHigh).toHaveAttribute("aria-checked", "false");
      await lowToHigh.click();
      await expect(page).toHaveURL(/[?&]sort=price_asc\b/);

      await trigger.click();
      await expect(page.getByRole("menuitemradio", { name: /price: low to high/i })).toHaveAttribute("aria-checked", "true");
      await page.keyboard.press("Escape");
      await expect(page.getByRole("menu")).toBeHidden();
    });

    test("choosing Login opens the login form", async ({ page }) => {
      await seedCookieConsent(page);
      await gotoApp(page, "/");
      await openUserMenu(page);
      await page.getByRole("menuitem", { name: "Login" }).click();
      await expect(page.getByRole("menu")).toBeHidden();
      await expect(page.getByRole("dialog").getByLabel(/email address/i)).toBeVisible();
    });

    test("a signed-in user's menus open, list their links and close on outside click", async ({ page }, testInfo) => {
      const { account } = await createUserFixture({ role: "CUSTOMER", suffix: `menus-${viewport.name}-r${testInfo.retry}` });
      await loginViaUi(page, account);
      // The bell only renders for a signed-in user, so it marks the navbar as refreshed after login.
      const bell = page.getByRole("button", { name: "Notifications" });
      await expect(bell).toBeVisible({ timeout: 30_000 });

      await openUserMenu(page);
      await expect(page.getByRole("menuitem", { name: "My Bookings" })).toBeVisible();
      await expect(page.getByRole("menuitem", { name: "Logout" })).toBeVisible();
      await page.mouse.click(5, viewport.height - 5);
      await expect(page.getByRole("menu")).toBeHidden();

      await bell.click();
      const panel = page.getByRole("dialog", { name: "Notifications" });
      await expect(panel).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(panel).toBeHidden();
    });
  });
}
