import { cleanupE2ERun } from "./cleanup";
import { getE2EEnv } from "./env";
import { readRunState } from "./run-state";

export default async function globalTeardown() {
  getE2EEnv();

  try {
    const state = readRunState();
    await cleanupE2ERun(state);
  } catch (error) {
    console.error("[e2e] Cleanup failed", error);
    throw error;
  }
}
