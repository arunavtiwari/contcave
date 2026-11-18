import "server-only";

import { geminiConfigured, type GeminiModelPolicy, ThinkingLevel } from "@/lib/ai/gemini";

/** Tried in order; the next model takes over when one is rate-limited, down or stalled. */
export const CONCIERGE_GEMINI: GeminiModelPolicy = {
    models: ["gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite"],
    perModelPerMinute: 30,
    order: "listed",
};

export const CONCIERGE_THINKING = ThinkingLevel.MEDIUM;

/** A model that sends nothing within this time is abandoned for the next one. */
export const CONCIERGE_FIRST_CHUNK_MS = 8_000;

export const CONCIERGE_TIMEOUT_MS = 30_000;

export const CONCIERGE_MAX_TOKENS = 1_500;
export const PLANNER_MAX_TOKENS = 3_000;

/** Conversation history sent to the model, in characters. */
export const CONCIERGE_HISTORY_CHARS = 60_000;

export const MAX_TOOL_ROUNDS = 6;

export const MAX_TURNS_PER_CONVERSATION = 40;

export const RATE_LIMITS = {
    perMinute: 8,
    perDay: 120,
} as const;

export const MAX_PLANS_PER_CONVERSATION = 3;

export const SHORTLIST_TTL_DAYS = 30;

export const VISITOR_COOKIE = "cc_concierge_vid";

export const conciergeEnabled = () => process.env.CONCIERGE_ENABLED !== "false" && geminiConfigured();
