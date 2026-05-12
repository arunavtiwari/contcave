import { getE2EEnv } from "./env";
import { createRunState } from "./run-state";

export default async function globalSetup() {
  const env = getE2EEnv();
  const state = createRunState(env.runId);

  console.warn(`[e2e] Starting guarded staging run ${state.runId} against ${env.baseUrl}`);
}
