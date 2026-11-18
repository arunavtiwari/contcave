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

    test("opens partway through and loads earlier studios when scrolling up", async ({ page }) => {
      test.skip((await feedPageCount(page)) < 2, "Needs at least two pages of studios in the test database");
      await gotoApp(page, "/studios?page=2");
      await expect(cards(page).first()).toBeVisible();
      const firstOfPageTwo = await cards(page).first().getAttribute("data-feed-id");
      await expect(page.getByRole("link", { name: "Earlier studios" })).toHaveAttribute("href", "/studios");

      await page.evaluate(() => window.scrollBy(0, 200));
      await page.evaluate(() => window.scrollTo(0, 0));
      await expect.poll(() => cards(page).count(), { timeout: 30_000 }).toBeGreaterThanOrEqual(PAGE_SIZE * 2);

      // The studios the visitor was looking at stay on screen after earlier ones are added above.
      const anchor = page.locator(`[data-feed-id="${firstOfPageTwo}"]`);
      const top = await anchor.evaluate((element) => element.getBoundingClientRect().top);
      expect(top).toBeGreaterThan(-200);
      expect(top).toBeLessThan(viewport.height);
    });
  });
}
