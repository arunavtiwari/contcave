import { getE2EEnv } from "./env";
import { createRunState } from "./run-state";

export default async function globalSetup() {
  const env = getE2EEnv();
  const state = createRunState(env.runId);

  console.warn(`[e2e] Starting guarded staging run ${state.runId} against ${env.baseUrl}`);

  const adminUrl = env.baseUrl.includes("localhost")
    ? env.baseUrl.replace("localhost", "admin.localhost")
    : env.baseUrl.replace("staging.contcave.com", "staging.admin.contcave.com");

  console.warn(`[e2e] Warming up ${env.baseUrl} and ${adminUrl}...`);
  try {
    await Promise.all([
      fetch(`${env.baseUrl}/api/auth/session`).catch(() => {}),
      fetch(`${adminUrl}/admin`).catch(() => {}),
    ]);
    console.warn(`[e2e] Warm-up completed successfully.`);
  } catch (error) {
    console.warn(`[e2e] Warm-up warning (non-blocking):`, error);
  }
}
