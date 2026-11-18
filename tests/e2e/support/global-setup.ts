import fs from "node:fs";
import path from "node:path";

import { cleanupE2ERun } from "./cleanup";
import { getE2EEnv } from "./env";
import { createRunState, type RunState, runStateDir, runStatePath } from "./run-state";

const ABANDONED_RUN_MS = 6 * 60 * 60 * 1000;

/** Cleans up after runs that crashed before teardown; recent files may belong to a run still going. */
async function recoverAbandonedRuns() {
  if (!fs.existsSync(runStateDir)) return;
  for (const name of fs.readdirSync(runStateDir)) {
    const file = path.join(runStateDir, name);
    if (file === runStatePath || Date.now() - fs.statSync(file).mtimeMs < ABANDONED_RUN_MS) continue;
    const stale = JSON.parse(fs.readFileSync(file, "utf8")) as RunState;
    console.warn(`[e2e] Recovering abandoned run ${stale.runId} before starting a new run.`);
    await cleanupE2ERun(stale);
    fs.unlinkSync(file);
  }
}

export default async function globalSetup() {
  const env = getE2EEnv();

  process.env.E2E_RUN_STATE_PATH = runStatePath;
  await recoverAbandonedRuns();

  if (process.env.QSTASH_DEV === "true") {
    const qstashUrl = (process.env.QSTASH_URL || "http://127.0.0.1:8080").replace(/\/$/, "");
    const response = await fetch(`${qstashUrl}/v2/keys`, {
      headers: process.env.QSTASH_TOKEN
        ? { Authorization: `Bearer ${process.env.QSTASH_TOKEN}` }
        : undefined,
    }).catch(() => null);
    if (!response?.ok) {
      throw new Error(`Local QStash is unavailable at ${qstashUrl}. Start it with: npm run qstash:dev`);
    }
  }

  const state = createRunState(env.runId);

  console.warn(`[e2e] Starting guarded staging run ${state.runId} against ${env.baseUrl}`);

  const adminUrl = env.baseUrl.includes("localhost")
    ? env.baseUrl.replace("localhost", "admin.localhost")
    : env.baseUrl.replace("staging.contcave.com", "staging.admin.contcave.com");

  console.warn(`[e2e] Warming up ${env.baseUrl} and ${adminUrl}...`);
  try {
    await Promise.all([
      fetch(`${env.baseUrl}/api/auth/session`).catch(() => {}),
      fetch(`${env.baseUrl}/payments/cashfree/return?tid=e2e_warmup`).catch(() => {}),
      fetch(`${adminUrl}/admin`).catch(() => {}),
    ]);
    console.warn(`[e2e] Warm-up completed successfully.`);
  } catch (error) {
    console.warn(`[e2e] Warm-up warning (non-blocking):`, error);
  }
}
