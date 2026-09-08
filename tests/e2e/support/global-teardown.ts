import { existsSync } from "node:fs";

import { cleanupE2ERun } from "./cleanup";
import { getE2EEnv } from "./env";
import { clearRunState, readRunState, runStatePath } from "./run-state";

export default async function globalTeardown() {
  getE2EEnv();
  // Global teardown runs even when global setup fails. In that case no run
  // state exists and there are no fixtures to clean up.
  if (!existsSync(runStatePath)) return;

  try {
    const state = readRunState();
    await cleanupE2ERun(state);
    clearRunState();
  } catch (error) {
    console.error("[e2e] Cleanup failed", error);
    throw error;
  }
}
