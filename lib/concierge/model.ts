import "server-only";

import type Anthropic from "@anthropic-ai/sdk";

import { CLAUDE_MODEL, claudeClient } from "@/lib/ai/claude";

import { CONCIERGE_FIRST_CHUNK_MS, CONCIERGE_TIMEOUT_MS } from "./config";

export type ToolCall = { id: string; name: string; arguments: string };

export type StoredToolCall = { id: string; type: "function"; function: { name: string; arguments: string } };

/** Spot's own transcript format, independent of the model provider; stored with each conversation. */
export type ChatMessage =
    | { role: "system"; content: string }
    | { role: "user"; content: string }
    | { role: "assistant"; content: string; tool_calls?: StoredToolCall[] }
    | { role: "tool"; tool_call_id: string; content: string };

export type ToolSpec = {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
};

export type ChatUsage = { input: number; output: number; cached: number };

export type ChatResult = {
    text: string;
    toolCalls: ToolCall[];
    finishReason: string | null;
    usage: ChatUsage;
};

type RequestOptions = {
    messages: ChatMessage[];
    tools?: ToolSpec[];
    maxTokens: number;
    onText?: (delta: string) => void;
};

const parseArgs = (raw: string): Record<string, unknown> => {
    try {
        const value: unknown = raw.trim() ? JSON.parse(raw) : {};
        return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
    } catch {
        return {};
    }
};

/** Claude tool-use ids allow letters, digits, "_" and "-"; ids stored by earlier providers may not. */
const toolUseId = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, "_") || "call";

/**
 * Spot's transcript as Claude messages. Thinking blocks are deliberately never replayed: Spot trims
 * old turns to a character budget, and replaying thinking alongside an edited history is rejected,
 * while dropping all of it is always valid. Each request still thinks; text and tool calls carry
 * the conversation.
 */
export function toClaudeMessages(messages: ChatMessage[]): { system: string; messages: Anthropic.MessageParam[] } {
    const system = messages.filter((message) => message.role === "system").map((message) => message.content).join("\n\n");
    const converted: Anthropic.MessageParam[] = [];

    for (const message of messages) {
        if (message.role === "system") continue;
        if (message.role === "user") {
            converted.push({ role: "user", content: message.content });
            continue;
        }
        if (message.role === "assistant") {
            const blocks: Anthropic.ContentBlockParam[] = message.content ? [{ type: "text", text: message.content }] : [];
            for (const call of message.tool_calls ?? []) {
                blocks.push({ type: "tool_use", id: toolUseId(call.id), name: call.function.name, input: parseArgs(call.function.arguments) });
            }
            if (blocks.length) converted.push({ role: "assistant", content: blocks });
            continue;
        }
        const result: Anthropic.ToolResultBlockParam = { type: "tool_result", tool_use_id: toolUseId(message.tool_call_id), content: message.content };
        const last = converted[converted.length - 1];
        // All results for one assistant turn go back in a single user message.
        if (last?.role === "user" && Array.isArray(last.content) && last.content.every((block) => block.type === "tool_result")) {
            last.content.push(result);
        } else {
            converted.push({ role: "user", content: [result] });
        }
    }
    return { system, messages: converted };
}

const toClaudeTools = (tools: ToolSpec[]): Anthropic.Tool[] =>
    tools.map(({ name, description, parameters }) => ({ name, description, input_schema: parameters as Anthropic.Tool.InputSchema }));

/** One streamed reply; text is forwarded as it arrives, tool calls are returned once complete. */
export async function chatStream(options: RequestOptions): Promise<ChatResult> {
    const { system, messages } = toClaudeMessages(options.messages);
    const stalled = new AbortController();
    const deadline = setTimeout(() => stalled.abort(), CONCIERGE_FIRST_CHUNK_MS);

    try {
        const stream = claudeClient().messages.stream(
            {
                model: CLAUDE_MODEL,
                max_tokens: options.maxTokens,
                system,
                messages,
                cache_control: { type: "ephemeral" },
                output_config: { effort: "low" },
                ...(options.tools?.length ? { tools: toClaudeTools(options.tools) } : {}),
            },
            { signal: AbortSignal.any([stalled.signal, AbortSignal.timeout(CONCIERGE_TIMEOUT_MS)]) },
        );
        stream.on("streamEvent", () => clearTimeout(deadline));
        stream.on("text", (delta) => options.onText?.(delta));

        const message = await stream.finalMessage();
        const toolCalls = message.content
            .filter((block): block is Anthropic.ToolUseBlock => block.type === "tool_use")
            .map((block) => ({ id: block.id, name: block.name, arguments: JSON.stringify(block.input) }));
        const text = message.content
            .filter((block): block is Anthropic.TextBlock => block.type === "text")
            .map((block) => block.text)
            .join("");

        return {
            text,
            toolCalls,
            finishReason: message.stop_reason === "max_tokens" ? "length" : message.stop_reason,
            usage: {
                input: message.usage.input_tokens,
                output: message.usage.output_tokens,
                cached: message.usage.cache_read_input_tokens ?? 0,
            },
        };
    } catch (error) {
        if (stalled.signal.aborted) throw new Error(`Claude sent nothing for ${CONCIERGE_FIRST_CHUNK_MS} ms`, { cause: error });
        throw error;
    } finally {
        clearTimeout(deadline);
    }
}
