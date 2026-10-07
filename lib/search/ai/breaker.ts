import { SEARCH_CONFIG } from "@/lib/search/config";
import { rateLimit } from "@/lib/security/rateLimit";

const LATENCY_SMOOTHING = 0.3;

const openUntil = new Map<string, number>();
const latencyMs = new Map<string, number>();

export function acquireAiSlot(provider: string, perMinute: number) {
    if ((openUntil.get(provider) ?? 0) > Date.now()) return false;
    return rateLimit({ key: `search-ai:${provider}`, limit: perMinute, windowMs: SEARCH_CONFIG.rateWindowMs }).allowed;
}

export function tripBreaker(provider: string, durationMs: number = SEARCH_CONFIG.ai.breakerDefaultMs) {
    openUntil.set(provider, Date.now() + durationMs);
}

export function recordLatency(provider: string, ms: number) {
    const previous = latencyMs.get(provider);
    latencyMs.set(provider, previous === undefined ? ms : previous + LATENCY_SMOOTHING * (ms - previous));
}

export const fastestFirst = (providers: readonly string[]) =>
    [...providers].sort((a, b) => (latencyMs.get(a) ?? 0) - (latencyMs.get(b) ?? 0));
