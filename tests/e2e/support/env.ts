import { randomUUID } from "node:crypto";

import { loadE2EProcessEnv } from "./load-env";

export type CashfreePaymentMethod =
  | {
      type: "upi";
      vpa: string;
    }
  | {
      type: "card";
      number: string;
      expiry: string;
      cvv: string;
      name: string;
      otp?: string;
    };

export type E2EEnv = {
  baseUrl: string;
  databaseUrl: string;
  runId: string;
  emailDomain: string;
  bankAccountNumber: string;
  bankIfsc: string;
  bankName: string;
  bankHolder: string;
  cashfreePaymentMethod: CashfreePaymentMethod;
};

export type E2EConnectionEnv = Pick<E2EEnv, "baseUrl" | "databaseUrl" | "runId" | "emailDomain">;

let cachedConnectionEnv: E2EConnectionEnv | null = null;
let cachedEnv: E2EEnv | null = null;

function firstDefined(names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name];
    if (value && value.trim().length > 0) return value.trim();
  }
  return undefined;
}

function required(name: string, fallbacks: string[] = []): string {
  const value = firstDefined([name, ...fallbacks]);
  if (!value || value.trim().length === 0) {
    const fallbackMessage = fallbacks.length > 0 ? ` or fallback ${fallbacks.join("/")}` : "";
    throw new Error(`Missing required E2E environment variable: ${name}${fallbackMessage}`);
  }
  return value;
}

function parsePaymentMethod(raw: string): CashfreePaymentMethod {
  const parsed = JSON.parse(raw) as Partial<CashfreePaymentMethod>;
  if (parsed.type === "upi" && typeof parsed.vpa === "string" && parsed.vpa) {
    return { type: "upi", vpa: parsed.vpa };
  }

  if (
    parsed.type === "card" &&
    typeof parsed.number === "string" &&
    typeof parsed.expiry === "string" &&
    typeof parsed.cvv === "string" &&
    typeof parsed.name === "string"
  ) {
    return {
      type: "card",
      number: parsed.number,
      expiry: parsed.expiry,
      cvv: parsed.cvv,
      name: parsed.name,
      otp: typeof parsed.otp === "string" ? parsed.otp : undefined,
    };
  }

  throw new Error('E2E_CASHFREE_PAYMENT_METHOD must be valid JSON for type "upi" or "card".');
}

function assertSafeBaseUrl(baseUrl: string) {
  const url = new URL(baseUrl);
  const host = url.hostname.toLowerCase();
  const blockedProductionHosts = new Set(["contcave.com", "www.contcave.com"]);

  if (blockedProductionHosts.has(host)) {
    throw new Error(`Refusing to run E2E tests against production host: ${host}`);
  }

  if (url.protocol !== "https:" && host !== "localhost" && host !== "127.0.0.1") {
    throw new Error("E2E_BASE_URL must be HTTPS unless running against localhost.");
  }
}

function databaseNameFromUrl(databaseUrl: string) {
  try {
    const url = new URL(databaseUrl);
    return decodeURIComponent(url.pathname.replace(/^\/+/, "").split("/")[0] || "");
  } catch {
    return "";
  }
}

function assertSafeDatabaseUrl(databaseUrl: string, expectedDatabaseName: string) {
  if (!/^mongodb(\+srv)?:\/\//i.test(databaseUrl)) {
    throw new Error("E2E_DATABASE_URL must be a MongoDB connection string.");
  }

  const databaseName = databaseNameFromUrl(databaseUrl);
  if (!databaseName || databaseName !== expectedDatabaseName) {
    throw new Error(
      `Refusing E2E writes: expected database "${expectedDatabaseName}", received "${databaseName || "<missing>"}".`
    );
  }
}

export function getE2EConnectionEnv(): E2EConnectionEnv {
  if (cachedConnectionEnv) return cachedConnectionEnv;
  loadE2EProcessEnv();

  const allowWrites = required("E2E_ALLOW_STAGING_WRITES");
  if (allowWrites !== "true") {
    throw new Error('E2E_ALLOW_STAGING_WRITES must be exactly "true".');
  }

  const baseUrl = required("E2E_BASE_URL").replace(/\/$/, "");
  const databaseUrl = required("E2E_DATABASE_URL");
  const expectedDatabaseName = required("E2E_EXPECTED_DATABASE_NAME");
  assertSafeBaseUrl(baseUrl);
  assertSafeDatabaseUrl(databaseUrl, expectedDatabaseName);

  process.env.E2E_BASE_URL = baseUrl;
  process.env.E2E_DATABASE_URL = databaseUrl;
  process.env.DATABASE_URL = databaseUrl;

  cachedConnectionEnv = {
    baseUrl,
    databaseUrl,
    // A timestamp alone can be reused by an interrupted or closely repeated run
    // against the same test database. Keep an explicit E2E_RUN_ID reproducible,
    // but make automatically generated fixture namespaces collision-resistant.
    runId: process.env.E2E_RUN_ID || `qa-e2e-${Date.now()}-${randomUUID().slice(0, 8)}`,
    emailDomain: required("E2E_EMAIL_DOMAIN"),
  };

  return cachedConnectionEnv;
}

export function getE2EEnv(): E2EEnv {
  if (cachedEnv) return cachedEnv;

  const connectionEnv = getE2EConnectionEnv();

  cachedEnv = {
    ...connectionEnv,
    bankAccountNumber: required("E2E_BANK_ACCOUNT_NUMBER"),
    bankIfsc: required("E2E_BANK_IFSC").toUpperCase(),
    bankName: required("E2E_BANK_NAME"),
    bankHolder: required("E2E_BANK_HOLDER"),
    cashfreePaymentMethod: parsePaymentMethod(required("E2E_CASHFREE_PAYMENT_METHOD")),
  };

  return cachedEnv;
}
