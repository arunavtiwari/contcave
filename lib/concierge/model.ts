import "server-only";

import {
    CONCIERGE_LLM_API_KEY,
    CONCIERGE_LLM_BASE_URL,
    CONCIERGE_LLM_EXTRA,
    CONCIERGE_LLM_MAX_RETRY_WAIT_MS,
    CONCIERGE_LLM_TIMEOUT_MS,
    CONCIERGE_LLM_TOKEN_PARAM,
    CONCIERGE_MODEL_FALLBACKS,
} from "./config";

/**
 * The concierge's model client. It speaks the OpenAI-compatible chat
 * completions protocol over plain fetch, which is what every common way of
 * serving open-source models exposes: Ollama, llama.cpp's server, vLLM,
 * LM Studio, and hosted endpoints such as Groq, Together or OpenRouter.
 * Which server and which model is configuration (lib/concierge/config.ts);
 * nothing here is tied to one vendor and there is no SDK dependency.
 */

export type ToolCall = { id: string; name: string; arguments: string };

/** A conversation message in the wire format, which is also how history is stored. */
export type ChatMessage =
    | { role: "system"; content: string }
    | { role: "user"; content: string }
    | { role: "assistant"; content: string; tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[] }
    | { role: "tool"; tool_call_id: string; content: string };

export type ToolSpec = {
    name: string;
    description: string;
    /** JSON Schema for the arguments. */
    parameters: Record<string, unknown>;
};

/** `cached` is the part of `input` the server reused from an earlier request, when it reports that. */
export type ChatUsage = { input: number; output: number; cached: number };

export type ChatResult = {
    text: string;
    toolCalls: ToolCall[];
    finishReason: string | null;
    usage: ChatUsage;
};

export class ModelError extends Error {
    constructor(
        message: string,
        readonly status?: number,
        /** How long the server asked us to wait, on a 429. */
        readonly retryAfterMs?: number
    ) {
        super(message);
        this.name = "ModelError";
    }
}

type RequestOptions = {
    model: string;
    messages: ChatMessage[];
    tools?: ToolSpec[];
    maxTokens: number;
    temperature?: number;
    /** Ask for a single JSON object back (no tools). */
    json?: boolean;
    onText?: (delta: string) => void;
};

const endpoint = () => `${CONCIERGE_LLM_BASE_URL().replace(/\/+$/, "")}/chat/completions`;

function headers(): Record<string, string> {
    const key = CONCIERGE_LLM_API_KEY();
    return { "Content-Type": "application/json", ...(key ? { Authorization: `Bearer ${key}` } : {}) };
}

function body(options: RequestOptions, stream: boolean) {
    return JSON.stringify({
        model: options.model,
        messages: options.messages,
        [CONCIERGE_LLM_TOKEN_PARAM()]: options.maxTokens,
        temperature: options.temperature ?? 0.2,
        stream,
        ...(stream ? { stream_options: { include_usage: true } } : {}),
        ...(options.tools?.length
            ? { tools: options.tools.map((tool) => ({ type: "function", function: tool })), tool_choice: "auto" }
            : {}),
        ...(options.json ? { response_format: { type: "json_object" } } : {}),
        ...CONCIERGE_LLM_EXTRA(),
    });
}

/** "retry-after" is seconds (possibly fractional) on the servers we talk to. */
function retryAfterMs(response: Response): number | undefined {
    const seconds = Number(response.headers.get("retry-after"));
    return Number.isFinite(seconds) && seconds >= 0 ? Math.ceil(seconds * 1000) : undefined;
}

/**
 * Send a request, moving to the next fallback model when the one asked for is rate-limited.
 * Other failures are not retried on another model: a bad request stays bad.
 */
async function post(options: RequestOptions, stream: boolean): Promise<Response> {
    const models = [options.model, ...CONCIERGE_MODEL_FALLBACKS().filter((model) => model !== options.model)];
    let lastError: unknown;
    for (const model of models) {
        try {
            return await postOnce({ ...options, model }, stream);
        } catch (error) {
            lastError = error;
            if (!(error instanceof ModelError) || error.status !== 429) throw error;
        }
    }
    throw lastError;
}

async function postOnce(options: RequestOptions, stream: boolean, attempt = 0): Promise<Response> {
    let response: Response;
    try {
        response = await fetch(endpoint(), {
            method: "POST",
            headers: headers(),
            body: body(options, stream),
            signal: AbortSignal.timeout(CONCIERGE_LLM_TIMEOUT_MS),
            cache: "no-store",
        });
    } catch (error) {
        throw new ModelError(error instanceof Error ? error.message : "The model server could not be reached");
    }
    if (!response.ok) {
        const detail = await response.text().catch(() => "");
        const wait = response.status === 429 ? retryAfterMs(response) : undefined;
        // A short rate-limit pause is worth sitting out once; a long one is not.
        if (response.status === 429 && attempt === 0 && wait !== undefined && wait <= CONCIERGE_LLM_MAX_RETRY_WAIT_MS) {
            await new Promise((resolve) => setTimeout(resolve, wait));
            return postOnce(options, stream, 1);
        }
        throw new ModelError(`Model server ${response.status}: ${detail.slice(0, 300)}`, response.status, wait);
    }
    return response;
}

type StreamChunk = {
    choices?: {
        delta?: {
            content?: string | null;
            tool_calls?: { index?: number; id?: string; function?: { name?: string; arguments?: string | Record<string, unknown> } }[];
        };
        finish_reason?: string | null;
    }[];
    usage?: WireUsage | null;
};

type WireUsage = { prompt_tokens?: number; completion_tokens?: number; prompt_tokens_details?: { cached_tokens?: number } | null };

const readUsage = (usage: WireUsage | null | undefined, into: ChatUsage) => {
    if (!usage) return;
    into.input = usage.prompt_tokens ?? into.input;
    into.output = usage.completion_tokens ?? into.output;
    into.cached = usage.prompt_tokens_details?.cached_tokens ?? into.cached;
};

/**
 * One streamed model call. Text is passed to `onText` as it arrives; tool
 * calls are assembled from their fragments and returned whole. Servers
 * differ in how they stream tool calls (in pieces by index, or all at once),
 * so both are handled.
 */
export async function chatStream(options: RequestOptions): Promise<ChatResult> {
    const response = await post(options, true);
    if (!response.body) throw new ModelError("The model server sent an empty response");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const calls = new Map<number, ToolCall>();
    const usage: ChatUsage = { input: 0, output: 0, cached: 0 };
    let text = "";
    let finishReason: string | null = null;
    let buffer = "";

    const handle = (line: string) => {
        if (!line.startsWith("data:")) return;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") return;
        let chunk: StreamChunk;
        try {
            chunk = JSON.parse(payload) as StreamChunk;
        } catch {
            return;
        }
        readUsage(chunk.usage, usage);
        const choice = chunk.choices?.[0];
        if (!choice) return;
        if (choice.finish_reason) finishReason = choice.finish_reason;
        const delta = choice.delta;
        if (delta?.content) {
            text += delta.content;
            options.onText?.(delta.content);
        }
        for (const [position, fragment] of (delta?.tool_calls ?? []).entries()) {
            const index = fragment.index ?? position;
            const call = calls.get(index) ?? { id: "", name: "", arguments: "" };
            if (fragment.id) call.id = fragment.id;
            if (fragment.function?.name) call.name += fragment.function.name;
            const args = fragment.function?.arguments;
            if (typeof args === "string") call.arguments += args;
            else if (args && typeof args === "object") call.arguments = JSON.stringify(args);
            calls.set(index, call);
        }
    };

    try {
        for (;;) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            let newline = buffer.indexOf("\n");
            while (newline >= 0) {
                handle(buffer.slice(0, newline).trim());
                buffer = buffer.slice(newline + 1);
                newline = buffer.indexOf("\n");
            }
        }
        handle(buffer.trim());
    } catch (error) {
        throw new ModelError(error instanceof Error ? error.message : "The model stream was interrupted");
    }

    const toolCalls = Array.from(calls.entries())
        .sort(([a], [b]) => a - b)
        .map(([index, call]) => ({ ...call, id: call.id || `call_${Date.now().toString(36)}_${index}` }))
        .filter((call) => call.name);

    return { text, toolCalls, finishReason, usage };
}

/** One non-streamed call that must return a JSON object. Returns null if the reply is not valid JSON. */
export async function chatJson(options: Omit<RequestOptions, "tools" | "onText" | "json">): Promise<{ value: unknown; usage: ChatUsage }> {
    const response = await post({ ...options, json: true }, false);
    const data = (await response.json().catch(() => null)) as {
        choices?: { message?: { content?: string | null } }[];
        usage?: WireUsage;
    } | null;
    const raw = data?.choices?.[0]?.message?.content ?? "";
    const usage: ChatUsage = { input: 0, output: 0, cached: 0 };
    readUsage(data?.usage, usage);
    // Some models wrap the object in a code fence or a sentence; take the outermost braces.
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start < 0 || end <= start) return { value: null, usage };
    try {
        return { value: JSON.parse(raw.slice(start, end + 1)), usage };
    } catch {
        return { value: null, usage };
    }
}
