import "server-only";

/**
 * Concierge settings. The model server, the models and the limits are read
 * from the environment, so they can be changed without a deploy.
 *
 * Models: the concierge runs on open-source models served behind an
 * OpenAI-compatible endpoint. Point CONCIERGE_LLM_BASE_URL at whichever
 * server holds them:
 *   - Ollama on the same machine:      http://127.0.0.1:11434/v1
 *   - llama.cpp server / vLLM / LM Studio: their /v1 URL
 *   - a hosted endpoint for open models (Groq, Together, OpenRouter): its /v1
 *     URL, with CONCIERGE_LLM_API_KEY set.
 *
 * Routing:
 *  - tier 1 (every conversational turn): CONCIERGE_MODEL. It must support
 *    tool calling.
 *  - tier 2 (one sub-task: drafting a shoot plan): CONCIERGE_PLANNER_MODEL,
 *    which defaults to the same model. The planner never sees the chat
 *    history and has no tools, so a larger model can be used just for it.
 *  - no model at all: lib/concierge/fallback.ts answers from the same tools
 *    when no server is configured or the server is down.
 */
export const CONCIERGE_LLM_BASE_URL = () => process.env.CONCIERGE_LLM_BASE_URL ?? "";
export const CONCIERGE_LLM_API_KEY = () => process.env.CONCIERGE_LLM_API_KEY ?? "";

/** An Apache-2.0 model small enough for a laptop and able to call tools; use a larger one in production. */
export const CONCIERGE_MODEL = () => process.env.CONCIERGE_MODEL || "qwen3:4b-instruct";
export const CONCIERGE_PLANNER_MODEL = () => process.env.CONCIERGE_PLANNER_MODEL || CONCIERGE_MODEL();

/**
 * Optional text added to the end of the system prompt, for model-specific switches
 * (for example "/no_think" to turn off Qwen 3's reasoning and answer faster).
 */
export const CONCIERGE_PROMPT_SUFFIX = () => process.env.CONCIERGE_PROMPT_SUFFIX ?? "";

/**
 * Extra fields merged into every request body, as JSON, for settings that only some servers
 * understand. Example for Groq's GPT-OSS models, which reason before answering:
 *   CONCIERGE_LLM_EXTRA={"reasoning_effort":"low","include_reasoning":false}
 */
export function CONCIERGE_LLM_EXTRA(): Record<string, unknown> {
    const raw = process.env.CONCIERGE_LLM_EXTRA;
    if (!raw) return {};
    try {
        const parsed: unknown = JSON.parse(raw);
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
    } catch {
        console.error("[concierge] CONCIERGE_LLM_EXTRA is not valid JSON; ignoring it");
        return {};
    }
}

/**
 * Models to try, in order, when the main one is rate-limited. Hosted free tiers limit each
 * model separately, so a second model of the same family doubles what the chat can serve.
 * They must accept the same CONCIERGE_LLM_EXTRA settings as the main model.
 */
export const CONCIERGE_MODEL_FALLBACKS = () =>
    (process.env.CONCIERGE_MODEL_FALLBACKS ?? "")
        .split(",")
        .map((model) => model.trim())
        .filter(Boolean);

/** Name of the output-limit field: "max_tokens" (Ollama, vLLM, most servers) or "max_completion_tokens" (Groq, OpenAI). */
export const CONCIERGE_LLM_TOKEN_PARAM = () => process.env.CONCIERGE_LLM_TOKEN_PARAM || "max_tokens";

/**
 * When the server says it is rate-limited and asks for a wait this short or shorter, wait and
 * try once more; any longer and the turn goes to the rule-based fallback instead of making
 * the customer wait. Free hosted tiers hit their per-minute limits often.
 */
export const CONCIERGE_LLM_MAX_RETRY_WAIT_MS = Number(process.env.CONCIERGE_LLM_MAX_RETRY_WAIT_MS) || 4_000;

/** A small model on a CPU or laptop GPU can take a while; a turn makes several calls. */
export const CONCIERGE_LLM_TIMEOUT_MS = Number(process.env.CONCIERGE_LLM_TIMEOUT_MS) || 90_000;

/** Replies are short chat messages; tool inputs are small. */
/** Raise both for models that reason before answering: their reasoning counts against the limit. */
export const CONCIERGE_MAX_TOKENS = Number(process.env.CONCIERGE_MAX_TOKENS) || 900;
export const PLANNER_MAX_TOKENS = Number(process.env.CONCIERGE_PLANNER_MAX_TOKENS) || 1800;

/**
 * How much conversation history is sent to the model, in characters (roughly 3.5 per token).
 * The default leaves room for the system prompt, tools and the reply inside an 8,192-token
 * window; raise it when the model server runs a larger one.
 */
export const CONCIERGE_HISTORY_CHARS = Number(process.env.CONCIERGE_HISTORY_CHARS) || 10_000;

/** Tool-use round trips allowed inside one customer turn. */
export const MAX_TOOL_ROUNDS = 6;

/** A conversation this long is going in circles: hand it to a person instead of spending more compute on it. */
export const MAX_TURNS_PER_CONVERSATION = 40;

/** Per visitor (cookie) and per IP address. */
export const RATE_LIMITS = {
    perMinute: 8,
    perDay: 120,
} as const;

/** Plans are the one tier-2 call; cap them so a single visitor can't tie up the model server. */
export const MAX_PLANS_PER_CONVERSATION = 3;

export const SHORTLIST_TTL_DAYS = 30;

export const VISITOR_COOKIE = "cc_concierge_vid";

export const conciergeEnabled = () => process.env.CONCIERGE_ENABLED !== "false";

/** Off until a model server is named: without one the chat runs on the rule-based fallback. */
export function hasModelAccess(): boolean {
    const url = CONCIERGE_LLM_BASE_URL();
    if (!url) return false;
    // A hosted endpoint without its key would refuse every request; skip the wasted call
    // and stay on the fallback until the key is added. Servers on this machine need none.
    const local = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|[^/]*\.local)(:|\/|$)/i.test(url);
    return local || Boolean(CONCIERGE_LLM_API_KEY());
}
