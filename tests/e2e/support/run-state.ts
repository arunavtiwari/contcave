import fs from "node:fs";
import path from "node:path";

export type CreatedRecordType =
  | "user"
  | "listing"
  | "reservation"
  | "transaction"
  | "invoice"
  | "voucher"
  | "voucherLock"
  | "voucherSequence"
  | "billingDetails"
  | "paymentDetails"
  | "r2Key"
  | "r2PrivateRef";

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
  voucher: [],
  voucherLock: [],
  voucherSequence: [],
  billingDetails: [],
  paymentDetails: [],
  r2Key: [],
  r2PrivateRef: [],
};

/** Every run's record of what it created, kept outside test-results (Playwright empties that folder per run). */
export const runStateDir = path.join(process.cwd(), ".e2e-runs");

/**
 * One file per run, so two runs in the same checkout never clear each other's records. Global setup
 * publishes the runner's path in E2E_RUN_STATE_PATH, which the test workers inherit.
 */
export const runStatePath = process.env.E2E_RUN_STATE_PATH ?? path.join(runStateDir, `run-${process.pid}.json`);

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

export function clearRunState() {
  if (fs.existsSync(runStatePath)) {
    fs.unlinkSync(runStatePath);
  }
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
