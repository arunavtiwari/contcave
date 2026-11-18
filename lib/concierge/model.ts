import "server-only";

import type { Content, FunctionCall, Part } from "@google/genai";

import { geminiClient, GeminiTimeoutError, withGeminiModels } from "@/lib/ai/gemini";

import { CONCIERGE_FIRST_CHUNK_MS, CONCIERGE_GEMINI, CONCIERGE_THINKING, CONCIERGE_TIMEOUT_MS } from "./config";

export type ToolCall = { id: string; name: string; arguments: string; signature?: string };

export type StoredToolCall = { id: string; type: "function"; function: { name: string; arguments: string }; signature?: string };

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

const SKIP_SIGNATURE = "skip_thought_signature_validator";

const parseArgs = (raw: string): Record<string, unknown> => {
    try {
        const value: unknown = raw.trim() ? JSON.parse(raw) : {};
        return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
    } catch {
        return {};
    }
};

const parseResponse = (raw: string): Record<string, unknown> => {
    const value = parseArgs(raw);
    return Object.keys(value).length ? value : { output: raw };
};

export function toGeminiContents(messages: ChatMessage[]): { system: string; contents: Content[] } {
    const system = messages.filter((message) => message.role === "system").map((message) => message.content).join("\n\n");
    const callNames = new Map<string, string>();
    const contents: Content[] = [];

    for (const message of messages) {
        if (message.role === "system") continue;
        if (message.role === "user") {
            contents.push({ role: "user", parts: [{ text: message.content }] });
            continue;
        }
        if (message.role === "assistant") {
            const parts: Part[] = message.content ? [{ text: message.content }] : [];
            const calls = message.tool_calls ?? [];
            const signed = calls.some((call) => call.signature);
            calls.forEach((call, index) => {
                callNames.set(call.id, call.function.name);
                parts.push({
                    functionCall: { id: call.id, name: call.function.name, args: parseArgs(call.function.arguments) },
                    ...(call.signature ? { thoughtSignature: call.signature } : !signed && index === 0 ? { thoughtSignature: SKIP_SIGNATURE } : {}),
                });
            });
            if (parts.length) contents.push({ role: "model", parts });
            continue;
        }
        const part: Part = {
            functionResponse: { id: message.tool_call_id, name: callNames.get(message.tool_call_id) ?? "tool", response: parseResponse(message.content) },
        };
        const last = contents[contents.length - 1];
        if (last?.role === "user" && last.parts?.every((entry) => entry.functionResponse)) last.parts.push(part);
        else contents.push({ role: "user", parts: [part] });
    }
    return { system, contents };
}

const toUsage = (metadata: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number; cachedContentTokenCount?: number } | undefined, into: ChatUsage) => {
    if (!metadata) return;
    into.input = metadata.promptTokenCount ?? into.input;
    into.output = (metadata.candidatesTokenCount ?? 0) + (metadata.thoughtsTokenCount ?? 0) || into.output;
    into.cached = metadata.cachedContentTokenCount ?? into.cached;
};

function toToolCall(call: FunctionCall, index: number, signature: string | undefined): ToolCall {
    return {
        id: call.id || `call_${Date.now().toString(36)}_${index}`,
        name: call.name ?? "",
        arguments: JSON.stringify(call.args ?? {}),
        ...(signature ? { signature } : {}),
    };
}

async function streamOnce(model: string, options: RequestOptions, signal: AbortSignal, onFirstChunk: () => void): Promise<ChatResult> {
    const { system, contents } = toGeminiContents(options.messages);
    const stream = await geminiClient().models.generateContentStream({
        model,
        contents,
        config: {
            systemInstruction: system,
            maxOutputTokens: options.maxTokens,
            thinkingConfig: { thinkingLevel: CONCIERGE_THINKING },
            abortSignal: signal,
            ...(options.tools?.length
                ? { tools: [{ functionDeclarations: options.tools.map(({ name, description, parameters }) => ({ name, description, parametersJsonSchema: parameters })) }] }
                : {}),
        },
    });

    const usage: ChatUsage = { input: 0, output: 0, cached: 0 };
    const toolCalls: ToolCall[] = [];
    let text = "";
    let finishReason: string | null = null;

    for await (const chunk of stream) {
        onFirstChunk();
        toUsage(chunk.usageMetadata, usage);
        const candidate = chunk.candidates?.[0];
        if (candidate?.finishReason) finishReason = candidate.finishReason;
        for (const part of candidate?.content?.parts ?? []) {
            if (part.thought) continue;
            if (part.functionCall) {
                toolCalls.push(toToolCall(part.functionCall, toolCalls.length, part.thoughtSignature));
            } else if (part.text) {
                text += part.text;
                options.onText?.(part.text);
            }
        }
    }

    return { text, toolCalls: toolCalls.filter((call) => call.name), finishReason: finishReason === "MAX_TOKENS" ? "length" : finishReason, usage };
}

export async function chatStream(options: RequestOptions): Promise<ChatResult> {
    return withGeminiModels("concierge", CONCIERGE_GEMINI, async (model) => {
        const stalled = new AbortController();
        const deadline = setTimeout(() => stalled.abort(), CONCIERGE_FIRST_CHUNK_MS);
        const signal = AbortSignal.any([stalled.signal, AbortSignal.timeout(CONCIERGE_TIMEOUT_MS)]);
        try {
            return await streamOnce(model, options, signal, () => clearTimeout(deadline));
        } catch (error) {
            if (stalled.signal.aborted) throw new GeminiTimeoutError(`${model} sent nothing for ${CONCIERGE_FIRST_CHUNK_MS} ms`);
            throw error;
        } finally {
            clearTimeout(deadline);
        }
    });
}
