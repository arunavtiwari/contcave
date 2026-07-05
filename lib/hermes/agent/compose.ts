import "server-only";

import type { PlanPayload } from "@/schemas/production";

import type { RetrievedCandidates } from "./retrieve";

/**
 * Agent step 3 — Compose (reasoning tier).
 * Brief + fingerprint + retrieved candidates -> ONE plan JSON within budget,
 * validated with planPayloadSchema before persisting (source: AGENT).
 *
 * PHASE 2 — stub only. See docs/production-agent.md.
 */

export async function composePlan(
    _briefId: string,
    _candidates: RetrievedCandidates
): Promise<PlanPayload> {
    throw new Error("Not implemented — production agent Phase 2");
}
