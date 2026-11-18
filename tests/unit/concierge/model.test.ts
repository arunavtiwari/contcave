import assert from "node:assert/strict";

import { describe, it } from "vitest";

import { type ChatMessage, toGeminiContents } from "@/lib/concierge/model";

const call = (id: string, name: string, signature?: string) => ({
    id,
    type: "function" as const,
    function: { name, arguments: JSON.stringify({ city: "Delhi" }) },
    ...(signature ? { signature } : {}),
});

describe("gemini contents", () => {
    it("moves system text into the system instruction", () => {
        const { system, contents } = toGeminiContents([
            { role: "system", content: "rules" },
            { role: "user", content: "hi" },
        ]);
        assert.equal(system, "rules");
        assert.deepEqual(contents, [{ role: "user", parts: [{ text: "hi" }] }]);
    });

    it("replays function calls with their thought signatures and groups their responses", () => {
        const messages: ChatMessage[] = [
            { role: "user", content: "studios in Delhi" },
            { role: "assistant", content: "", tool_calls: [call("a", "update_brief", "sig-1"), call("b", "search_studios")] },
            { role: "tool", tool_call_id: "a", content: "{\"ok\":true}" },
            { role: "tool", tool_call_id: "b", content: "not json" },
            { role: "assistant", content: "Here they are." },
        ];
        const { contents } = toGeminiContents(messages);
        assert.equal(contents.length, 4);
        const model = contents[1].parts ?? [];
        assert.equal(model[0].thoughtSignature, "sig-1");
        assert.equal(model[1].thoughtSignature, undefined);
        assert.deepEqual(model[0].functionCall, { id: "a", name: "update_brief", args: { city: "Delhi" } });
        const responses = contents[2].parts ?? [];
        assert.equal(contents[2].role, "user");
        assert.deepEqual(responses.map((part) => part.functionResponse?.name), ["update_brief", "search_studios"]);
        assert.deepEqual(responses[1].functionResponse?.response, { output: "not json" });
        assert.equal(contents[3].role, "model");
    });

    it("marks unsigned calls from older history so Gemini accepts them", () => {
        const { contents } = toGeminiContents([
            { role: "user", content: "x" },
            { role: "assistant", content: "", tool_calls: [call("a", "search_studios"), call("b", "get_studio")] },
        ]);
        const parts = contents[1].parts ?? [];
        assert.equal(parts[0].thoughtSignature, "skip_thought_signature_validator");
        assert.equal(parts[1].thoughtSignature, undefined);
    });
});
