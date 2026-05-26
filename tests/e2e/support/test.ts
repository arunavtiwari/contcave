import { test as base } from "@playwright/test";

export const test = base.extend({
  page: async ({ page }, use) => {
    // Block unnecessary media/fonts GET requests to speed up test execution
    // Allow POST/PUT/etc. requests to ensure uploads to storage providers like Cloudflare R2 work
    await page.route("**/*.{png,jpg,jpeg,gif,webp,mp4,woff,woff2}", (route) => {
      if (route.request().method() === "GET") {
        route.abort();
      } else {
        route.continue();
      }
    });
    await use(page);
  },
});

export { expect } from "@playwright/test";
