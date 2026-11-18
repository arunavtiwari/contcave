import { rateLimit } from "@/lib/security/rateLimit";

const WINDOW_MS = 60_000;
const DEFAULT_PAUSE_MS = 60_000;
const LATENCY_SMOOTHING = 0.3;

const openUntil = new Map<string, number>();
const latencyMs = new Map<string, number>();

export function acquireAiSlot(model: string, perMinute: number) {
    if ((openUntil.get(model) ?? 0) > Date.now()) return false;
    return rateLimit({ key: `gemini:${model}`, limit: perMinute, windowMs: WINDOW_MS }).allowed;
}

export function tripBreaker(model: string, durationMs: number = DEFAULT_PAUSE_MS) {
    openUntil.set(model, Date.now() + durationMs);
}

export function recordLatency(model: string, ms: number) {
    const previous = latencyMs.get(model);
    latencyMs.set(model, previous === undefined ? ms : previous + LATENCY_SMOOTHING * (ms - previous));
}

export const fastestFirst = (models: readonly string[]) =>
    [...models].sort((a, b) => (latencyMs.get(a) ?? 0) - (latencyMs.get(b) ?? 0));
