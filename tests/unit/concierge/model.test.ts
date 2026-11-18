import { describe, expect, it } from "vitest";

import { type ChatMessage, toClaudeMessages } from "@/lib/concierge/model";

const call = (id: string, name: string, args: Record<string, unknown>) => ({
    id,
    type: "function" as const,
    function: { name, arguments: JSON.stringify(args) },
});

describe("toClaudeMessages", () => {
    it("moves system text into the system prompt", () => {
        const { system, messages } = toClaudeMessages([
            { role: "system", content: "Be brief." },
            { role: "system", content: "Use rupees." },
            { role: "user", content: "Hi" },
        ]);
        expect(system).toBe("Be brief.\n\nUse rupees.");
        expect(messages).toEqual([{ role: "user", content: "Hi" }]);
    });

    it("replays tool calls as tool_use blocks and groups their results in one user message", () => {
        const history: ChatMessage[] = [
            { role: "user", content: "Podcast studio in Delhi" },
            { role: "assistant", content: "Searching.", tool_calls: [call("a1", "search_studios", { city: "Delhi" }), call("a2", "check_date", { day: "2026-11-19" })] },
            { role: "tool", tool_call_id: "a1", content: '{"count":3}' },
            { role: "tool", tool_call_id: "a2", content: '{"free":true}' },
        ];
        const { messages } = toClaudeMessages(history);

        expect(messages[1]).toEqual({
            role: "assistant",
            content: [
                { type: "text", text: "Searching." },
                { type: "tool_use", id: "a1", name: "search_studios", input: { city: "Delhi" } },
                { type: "tool_use", id: "a2", name: "check_date", input: { day: "2026-11-19" } },
            ],
        });
        expect(messages[2]).toEqual({
            role: "user",
            content: [
                { type: "tool_result", tool_use_id: "a1", content: '{"count":3}' },
                { type: "tool_result", tool_use_id: "a2", content: '{"free":true}' },
            ],
        });
        expect(messages).toHaveLength(3);
    });

    it("keeps tool-call ids from older conversations valid", () => {
        const { messages } = toClaudeMessages([
            { role: "user", content: "x" },
            { role: "assistant", content: "", tool_calls: [call("call:1/x", "search_studios", {})] },
            { role: "tool", tool_call_id: "call:1/x", content: "{}" },
        ]);
        expect(messages[1]).toMatchObject({ content: [{ type: "tool_use", id: "call_1_x" }] });
        expect(messages[2]).toMatchObject({ content: [{ type: "tool_result", tool_use_id: "call_1_x" }] });
    });

    it("drops empty assistant turns and survives malformed stored arguments", () => {
        const { messages } = toClaudeMessages([
            { role: "user", content: "x" },
            { role: "assistant", content: "" },
            { role: "assistant", content: "", tool_calls: [{ id: "b", type: "function", function: { name: "t", arguments: "{oops" } }] },
        ]);
        expect(messages).toEqual([
            { role: "user", content: "x" },
            { role: "assistant", content: [{ type: "tool_use", id: "b", name: "t", input: {} }] },
        ]);
    });
});
