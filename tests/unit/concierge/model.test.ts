import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";

import { chatJson, chatStream, ModelError } from "@/lib/concierge/model";

/** A tiny OpenAI-compatible server whose behaviour is chosen by the model name in the request. */
let server: http.Server;
const seen: { auth?: string; body: Record<string, unknown> }[] = [];

const chunk = (delta: Record<string, unknown>, finish: string | null = null) => `data: ${JSON.stringify({ choices: [{ index: 0, delta, finish_reason: finish }] })}\n\n`;

before(async () => {
    server = http.createServer((req, res) => {
        let raw = "";
        req.on("data", (data) => (raw += data));
        req.on("end", () => {
            const body = JSON.parse(raw) as { model: string; stream: boolean };
            seen.push({ auth: req.headers.authorization, body: body as unknown as Record<string, unknown> });
            if (body.model === "busy-briefly" || body.model === "busy-long") {
                const earlier = seen.filter((request) => request.body.model === body.model).length;
                if (earlier === 1 || body.model === "busy-long") {
                    res.writeHead(429, { "Content-Type": "application/json", "retry-after": body.model === "busy-briefly" ? "0.05" : "30" });
                    return res.end(JSON.stringify({ error: "rate limit" }));
                }
            }
            if (body.model === "down") {
                res.writeHead(503, { "Content-Type": "application/json" });
                return res.end(JSON.stringify({ error: "overloaded" }));
            }
            if (!body.stream) {
                res.writeHead(200, { "Content-Type": "application/json" });
                const content = body.model === "garbage" ? "sorry, no JSON today" : "Here you go:\n```json\n{\"title\":\"Plan\",\"n\":2}\n```";
                return res.end(JSON.stringify({ choices: [{ message: { content } }], usage: { prompt_tokens: 11, completion_tokens: 7 } }));
            }
            res.writeHead(200, { "Content-Type": "text/event-stream" });
            if (body.model === "whole-call") {
                // Ollama style: the whole call in one chunk, arguments as an object, no id.
                res.write(chunk({ tool_calls: [{ function: { name: "get_studio", arguments: { studio_id: "abc" } } }] }, "tool_calls"));
            } else {
                res.write(chunk({ content: "Let me " }));
                // Split a data line across two TCP writes.
                const line = chunk({ content: "look." });
                res.write(line.slice(0, 20));
                res.write(line.slice(20));
                res.write(chunk({ tool_calls: [{ index: 0, id: "call_1", function: { name: "search_", arguments: "" } }] }));
                res.write(chunk({ tool_calls: [{ index: 0, function: { name: "studios", arguments: "{\"city\":" } }] }));
                res.write(chunk({ tool_calls: [{ index: 0, function: { arguments: "\"Delhi\"}" } }] }));
                res.write(chunk({ tool_calls: [{ index: 1, id: "call_2", function: { name: "update_brief", arguments: "{}" } }] }));
                res.write("data: not json at all\n\n");
                res.write(chunk({}, "tool_calls"));
            }
            res.write(`data: ${JSON.stringify({ choices: [], usage: { prompt_tokens: 1900, completion_tokens: 40, prompt_tokens_details: { cached_tokens: 1500 } } })}\n\n`);
            res.end("data: [DONE]\n\n");
        });
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    process.env.CONCIERGE_LLM_BASE_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1/`;
    process.env.CONCIERGE_LLM_API_KEY = "test-key";
});

after(() => new Promise<void>((resolve) => server.close(() => resolve())));

describe("model client", () => {
    it("streams text and assembles tool calls sent in fragments", async () => {
        let streamed = "";
        const result = await chatStream({
            model: "fragments",
            maxTokens: 100,
            messages: [{ role: "user", content: "hi" }],
            tools: [{ name: "search_studios", description: "d", parameters: { type: "object", properties: {} } }],
            onText: (delta) => (streamed += delta),
        });
        assert.equal(streamed, "Let me look.");
        assert.equal(result.text, "Let me look.");
        assert.deepEqual(result.toolCalls, [
            { id: "call_1", name: "search_studios", arguments: "{\"city\":\"Delhi\"}" },
            { id: "call_2", name: "update_brief", arguments: "{}" },
        ]);
        assert.equal(result.finishReason, "tool_calls");
        assert.deepEqual(result.usage, { input: 1900, output: 40, cached: 1500 });
    });

    it("sends the key, the tools and a trimmed URL", () => {
        const request = seen[seen.length - 1];
        assert.equal(request.auth, "Bearer test-key");
        assert.equal((request.body.tools as unknown[]).length, 1);
        assert.equal(request.body.stream, true);
    });

    it("accepts a tool call sent whole, with object arguments and no id", async () => {
        const result = await chatStream({ model: "whole-call", maxTokens: 100, messages: [{ role: "user", content: "hi" }] });
        assert.equal(result.toolCalls.length, 1);
        assert.equal(result.toolCalls[0].name, "get_studio");
        assert.equal(result.toolCalls[0].arguments, "{\"studio_id\":\"abc\"}");
        assert.ok(result.toolCalls[0].id.length > 0);
    });

    it("pulls a JSON object out of a fenced reply", async () => {
        const { value, usage } = await chatJson({ model: "json", maxTokens: 100, messages: [{ role: "user", content: "{}" }] });
        assert.deepEqual(value, { title: "Plan", n: 2 });
        assert.deepEqual(usage, { input: 11, output: 7, cached: 0 });
    });

    it("returns null when the reply has no JSON in it", async () => {
        const { value } = await chatJson({ model: "garbage", maxTokens: 100, messages: [{ role: "user", content: "{}" }] });
        assert.equal(value, null);
    });

    it("raises a ModelError with the status when the server fails", async () => {
        await assert.rejects(
            chatStream({ model: "down", maxTokens: 100, messages: [{ role: "user", content: "hi" }] }),
            (error: unknown) => error instanceof ModelError && error.status === 503
        );
    });

    it("waits out a short rate-limit pause and succeeds on the second try", async () => {
        const result = await chatStream({ model: "busy-briefly", maxTokens: 100, messages: [{ role: "user", content: "hi" }] });
        assert.equal(result.text, "Let me look.");
        assert.equal(seen.filter((request) => request.body.model === "busy-briefly").length, 2);
    });

    it("gives up at once on a long rate-limit pause, reporting how long", async () => {
        await assert.rejects(
            chatStream({ model: "busy-long", maxTokens: 100, messages: [{ role: "user", content: "hi" }] }),
            (error: unknown) => error instanceof ModelError && error.status === 429 && error.retryAfterMs === 30_000
        );
        assert.equal(seen.filter((request) => request.body.model === "busy-long").length, 1);
    });

    it("moves to a fallback model when the main one is rate-limited for long", async () => {
        process.env.CONCIERGE_MODEL_FALLBACKS = "busy-long-2, fragments";
        try {
            const before = seen.length;
            const result = await chatStream({ model: "busy-long", maxTokens: 100, messages: [{ role: "user", content: "hi" }] });
            assert.equal(result.text, "Let me look.");
            assert.deepEqual(seen.slice(before).map((request) => request.body.model), ["busy-long", "busy-long-2"]);
        } finally {
            delete process.env.CONCIERGE_MODEL_FALLBACKS;
        }
    });

    it("does not try another model for errors that are not rate limits", async () => {
        process.env.CONCIERGE_MODEL_FALLBACKS = "fragments";
        try {
            const before = seen.length;
            await assert.rejects(chatStream({ model: "down", maxTokens: 100, messages: [{ role: "user", content: "hi" }] }), ModelError);
            assert.equal(seen.length - before, 1);
        } finally {
            delete process.env.CONCIERGE_MODEL_FALLBACKS;
        }
    });

    it("merges extra settings and uses the configured output-limit field", async () => {
        process.env.CONCIERGE_LLM_EXTRA = '{"reasoning_effort":"low","include_reasoning":false}';
        process.env.CONCIERGE_LLM_TOKEN_PARAM = "max_completion_tokens";
        try {
            await chatStream({ model: "extras", maxTokens: 321, messages: [{ role: "user", content: "hi" }] });
            const body = seen[seen.length - 1].body;
            assert.equal(body.reasoning_effort, "low");
            assert.equal(body.include_reasoning, false);
            assert.equal(body.max_completion_tokens, 321);
            assert.equal(body.max_tokens, undefined);
        } finally {
            delete process.env.CONCIERGE_LLM_EXTRA;
            delete process.env.CONCIERGE_LLM_TOKEN_PARAM;
        }
    });

    it("ignores extra settings that are not valid JSON", async () => {
        process.env.CONCIERGE_LLM_EXTRA = "{not json";
        try {
            const result = await chatStream({ model: "extras", maxTokens: 10, messages: [{ role: "user", content: "hi" }] });
            assert.equal(result.text, "Let me look.");
        } finally {
            delete process.env.CONCIERGE_LLM_EXTRA;
        }
    });

    it("raises a ModelError when the server cannot be reached", async () => {
        const previous = process.env.CONCIERGE_LLM_BASE_URL;
        process.env.CONCIERGE_LLM_BASE_URL = "http://127.0.0.1:9/v1";
        try {
            await assert.rejects(chatStream({ model: "x", maxTokens: 10, messages: [{ role: "user", content: "hi" }] }), ModelError);
        } finally {
            process.env.CONCIERGE_LLM_BASE_URL = previous;
        }
    });
});
