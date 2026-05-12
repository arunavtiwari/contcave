import fs from "node:fs";
import path from "node:path";

export type CreatedRecordType =
  | "user"
  | "listing"
  | "reservation"
  | "transaction"
  | "invoice"
  | "billingDetails"
  | "paymentDetails"
  | "r2Key";

export type RunState = {
  runId: string;
  created: Record<CreatedRecordType, string[]>;
};

const emptyCreated: Record<CreatedRecordType, string[]> = {
  user: [],
  listing: [],
  reservation: [],
  transaction: [],
  invoice: [],
  billingDetails: [],
  paymentDetails: [],
  r2Key: [],
};

export const runStatePath = path.join(process.cwd(), "test-results", "e2e-run-state.json");

function ensureDir() {
  fs.mkdirSync(path.dirname(runStatePath), { recursive: true });
}

export function createRunState(runId: string): RunState {
  ensureDir();
  const state: RunState = {
    runId,
    created: { ...emptyCreated },
  };
  fs.writeFileSync(runStatePath, JSON.stringify(state, null, 2));
  return state;
}

export function readRunState(): RunState {
  if (!fs.existsSync(runStatePath)) {
    throw new Error(`Missing E2E run state file: ${runStatePath}`);
  }

  return JSON.parse(fs.readFileSync(runStatePath, "utf8")) as RunState;
}

export function updateRunState(updater: (state: RunState) => RunState): RunState {
  ensureDir();
  const current = fs.existsSync(runStatePath)
    ? (JSON.parse(fs.readFileSync(runStatePath, "utf8")) as RunState)
    : createRunState(`qa-e2e-${Date.now()}`);
  const next = updater(current);
  fs.writeFileSync(runStatePath, JSON.stringify(next, null, 2));
  return next;
}

export function trackCreated(type: CreatedRecordType, id: string | null | undefined) {
  if (!id) return;
  updateRunState((state) => {
    const existing = new Set(state.created[type] || []);
    existing.add(id);
    return {
      ...state,
      created: {
        ...state.created,
        [type]: Array.from(existing),
      },
    };
  });
}
