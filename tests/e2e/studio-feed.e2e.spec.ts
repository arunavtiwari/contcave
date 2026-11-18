import type { Page } from "@playwright/test";

import { getE2EConnectionEnv } from "./support/env";
import { expect, test } from "./support/test";
import { gotoApp } from "./support/ui";

const PAGE_SIZE = 20;
const VIEWPORTS = [
  { name: "phone", width: 375, height: 812 },
  { name: "desktop", width: 1440, height: 900 },
] as const;

const cards = (page: Page) => page.locator("[data-feed-id]");

async function scrollToBottom(page: Page) {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
}

async function feedPageCount(page: Page) {
  const response = await page.request.get(`${getE2EConnectionEnv().baseUrl}/api/listings/feed?page=2`);
  const body = (await response.json()) as { data?: { totalPages?: number } };
  return body.data?.totalPages ?? 0;
}

for (const viewport of VIEWPORTS) {
  test.describe(`studio feed infinite scroll (${viewport.name})`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test("loads the next studios on scroll and keeps the URL on the page in view", async ({ page }) => {
      test.skip((await feedPageCount(page)) < 2, "Needs at least two pages of studios in the test database");
      await gotoApp(page, "/studios");
      await expect(cards(page)).toHaveCount(PAGE_SIZE);

      await expect(page.getByRole("button", { name: /show more|load more/i })).toHaveCount(0);
      await expect(page.getByRole("link", { name: "More studios" })).toHaveAttribute("href", /page=2/);

      await scrollToBottom(page);
      await expect.poll(() => cards(page).count(), { timeout: 30_000 }).toBeGreaterThan(PAGE_SIZE);

      const secondPageStart = cards(page).nth(PAGE_SIZE);
      await secondPageStart.scrollIntoViewIfNeeded();
      await page.evaluate(() => window.scrollBy(0, 1));
      await expect(page).toHaveURL(/[?&]page=2\b/);

      await page.evaluate(() => window.scrollTo(0, 0));
      await expect(page).not.toHaveURL(/[?&]page=/);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    });

    test("returns to the same studios and position after opening a studio and going back", async ({ page }) => {
      test.skip((await feedPageCount(page)) < 2, "Needs at least two pages of studios in the test database");
      await gotoApp(page, "/studios");
      await scrollToBottom(page);
      await expect.poll(() => cards(page).count(), { timeout: 30_000 }).toBeGreaterThan(PAGE_SIZE);

      const target = cards(page).nth(PAGE_SIZE + 1);
      await target.scrollIntoViewIfNeeded();
      const targetId = await target.getAttribute("data-feed-id");
      const loadedCount = await cards(page).count();
      const topBefore = await target.evaluate((element) => element.getBoundingClientRect().top);

      await target.locator("a[href*='/studio/']").first().click();
      await expect(page).toHaveURL(/\/studio\//, { timeout: 60_000 });
      await page.goBack();

      const returned = page.locator(`[data-feed-id="${targetId}"]`);
      await expect(returned).toBeVisible({ timeout: 30_000 });
      expect(await cards(page).count()).toBeGreaterThanOrEqual(loadedCount);
      await expect.poll(() => returned.evaluate((element) => element.getBoundingClientRect().top)).toBeGreaterThan(topBefore - 120);
      expect(await returned.evaluate((element) => element.getBoundingClientRect().top)).toBeLessThan(topBefore + 120);
    });

    test("opens partway through without loading anything above the visitor", async ({ page }) => {
      test.skip((await feedPageCount(page)) < 2, "Needs at least two pages of studios in the test database");
      await gotoApp(page, "/studios?page=2");
      await expect(cards(page)).toHaveCount(PAGE_SIZE);
      const firstOfPageTwo = await cards(page).first().getAttribute("data-feed-id");
      await expect(page.getByRole("link", { name: "Earlier studios" })).toHaveAttribute("href", "/studios");

      // Scrolling up never inserts studios above, so nothing jumps under the visitor.
      await page.evaluate(() => window.scrollBy(0, 400));
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(1_500);
      await expect(cards(page).first()).toHaveAttribute("data-feed-id", firstOfPageTwo ?? "");
    });
  });
}
