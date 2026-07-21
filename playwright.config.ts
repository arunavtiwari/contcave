/* eslint-disable @typescript-eslint/no-explicit-any -- Node's CommonJS loader hooks are intentionally untyped. */
import dns from "node:dns";
import fs from "node:fs";
import Module from "node:module";

import { defineConfig, devices } from "@playwright/test";
import ts from "typescript";

import { loadE2EProcessEnv } from "./tests/e2e/support/load-env";

dns.setDefaultResultOrder("ipv4first");

// Server-level specs import server-only application modules directly in the Playwright worker.
const originalRequire = Module.prototype.require;
Module.prototype.require = function (this: any, id: string) {
  if (id === "server-only") {
    return {};
  }
  return originalRequire.apply(this, arguments as any);
};

// Bypass Playwright's custom JSX component transform (which injects __pw_type) for files in lib/
const originalLoader = (require.extensions as any)[".tsx"];
(require.extensions as any)[".tsx"] = function (module: any, filename: string) {
  if (filename.replace(/\\/g, "/").includes("/lib/")) {
    const content = fs.readFileSync(filename, "utf8");
    const result = ts.transpileModule(content, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
        skipLibCheck: true,
      },
    });
    return module._compile(result.outputText, filename);
  }
  return originalLoader(module, filename);
};

loadE2EProcessEnv();

const baseURL = (process.env.E2E_BASE_URL || process.env.APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000").replace(
  /\/$/,
  ""
);
const isCI = !!process.env.CI;
const baseUrlHost = new URL(baseURL).hostname;
const isLocalBaseUrl = ["localhost", "127.0.0.1"].includes(baseUrlHost);
const useRealCashfree = process.env.E2E_USE_REAL_CASHFREE === "true";

if (isLocalBaseUrl && !useRealCashfree) {
  process.env.E2E_ENABLE_CASHFREE_SIMULATOR ??= "true";
  process.env.NEXT_PUBLIC_E2E_BYPASS_CASHFREE_CHECKOUT ??= "true";
  process.env.E2E_DISABLE_CASHFREE_REFUND ??= "true";
  process.env.E2E_DISABLE_EMAIL_SEND ??= "true";
  process.env.E2E_DISABLE_WHATSAPP_SEND ??= "true";
  process.env.E2E_DISABLE_R2_UPLOAD ??= "true";
  // The expiry fixture models a booking created 25 hours ago, so place this
  // isolated database's activation boundary one hour before that fixture.
  // Production continues to provide its real deployment timestamp explicitly.
  process.env.NOTIFICATION_AUTOMATION_START_AT ??= new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString();
}

const shouldStartLocalServer =
  process.env.E2E_START_LOCAL_SERVER === "true" && isLocalBaseUrl;
if (shouldStartLocalServer) {
  // Keep the E2E cache stable. A process-id-specific directory causes Next to
  // append a new generated-types path to tsconfig.json on every test run.
  process.env.NEXT_DIST_DIR = ".next/e2e";
}
const webServerEnv = Object.fromEntries(
  Object.entries(process.env).filter((entry): entry is [string, string] => typeof entry[1] === "string")
);

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
        reuseExistingServer: false,
        timeout: 120_000,
        env: {
          ...webServerEnv,
          NODE_OPTIONS: "--dns-result-order=ipv4first",
        },
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
