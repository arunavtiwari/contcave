import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 120_000,
  fullyParallel: true,
  reporter: "list",
  globalSetup: "./tests/global.setup.ts",
  use: {
    baseURL: "http://127.0.0.1:3100",
  },
  webServer: {
    command: "cmd /c set NEXT_PUBLIC_E2E_TEST_MODE=true && npm run dev -- --hostname 127.0.0.1 --port 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
