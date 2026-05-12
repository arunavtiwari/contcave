import { defineConfig, devices } from "@playwright/test";

import { loadE2EProcessEnv } from "./tests/e2e/support/load-env";

loadE2EProcessEnv();

const baseURL = (process.env.E2E_BASE_URL || process.env.APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000").replace(
  /\/$/,
  ""
);
const isCI = !!process.env.CI;
const baseUrlHost = new URL(baseURL).hostname;
const shouldStartLocalServer =
  process.env.E2E_START_LOCAL_SERVER === "true" && ["localhost", "127.0.0.1"].includes(baseUrlHost);

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 120_000,
  expect: {
    timeout: 15_000,
  },
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: 1,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["junit", { outputFile: "test-results/e2e-junit.xml" }],
  ],
  webServer: shouldStartLocalServer
    ? {
        command: "npm run dev",
        url: baseURL,
        reuseExistingServer: !isCI,
        timeout: 120_000,
      }
    : undefined,
  globalSetup: "./tests/e2e/support/global-setup.ts",
  globalTeardown: "./tests/e2e/support/global-teardown.ts",
  use: {
    baseURL,
    actionTimeout: 30_000,
    navigationTimeout: 60_000,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "staging-chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
});
