import assert from "node:assert/strict";

import { describe, it } from "vitest";

import { mergeBrief } from "@/lib/concierge/brief";
import { HELP_ARTICLES, searchHelp } from "@/lib/concierge/help";
import { windowHistory } from "@/lib/concierge/history";
import type { ChatMessage } from "@/lib/concierge/model";
import { splitBudget } from "@/lib/concierge/planner";
import { conciergeSystemPrompt } from "@/lib/concierge/prompts";
import { TOOL_DEFINITIONS } from "@/lib/concierge/toolSpecs";

describe("help search", () => {
    it("routes policy questions to the right article", () => {
        assert.equal(searchHelp("can I get a refund if I cancel?")[0]?.id, "cancellation");
        assert.equal(searchHelp("is gst extra?")[0]?.id, "payment-gst");
        assert.equal(searchHelp("what does curated mean")[0]?.id, "verified-vs-curated");
        assert.equal(searchHelp("shoot is running long, can we extend")[0]?.id, "extra-time");
    });

    it("returns nothing for unrelated questions", () => {
        assert.equal(searchHelp("what is the capital of France").length, 0);
        assert.equal(searchHelp("write me a poem about the sea").length, 0);
    });

    it("has no contact numbers or prices in the articles", () => {
        for (const article of HELP_ARTICLES) assert.ok(!/₹|\b[6-9]\d{9}\b/.test(article.body), article.id);
    });
});

describe("history window", () => {
    const turn = (n: number, size = 200): ChatMessage[] => [
        { role: "user", content: `q${n} ${"x".repeat(size)}` },
        { role: "assistant", content: "", tool_calls: [{ id: `c${n}`, type: "function", function: { name: "search_studios", arguments: "{}" } }] },
        { role: "tool", tool_call_id: `c${n}`, content: "{}" },
        { role: "assistant", content: `a${n}` },
    ];
    const history = Array.from({ length: 12 }, (_, index) => turn(index)).flat();

    it("returns everything when it fits", () => {
        assert.equal(windowHistory(history, 1_000_000), history);
    });

    it("cuts only at the start of a customer turn and keeps tool calls with their results", () => {
        const windowed = windowHistory(history, 2500);
        assert.ok(windowed.length < history.length);
        assert.equal(windowed[0].role, "user");
        const callIds = windowed.flatMap((message) => (message.role === "assistant" ? (message.tool_calls ?? []).map((call) => call.id) : []));
        const resultIds = windowed.flatMap((message) => (message.role === "tool" ? [message.tool_call_id] : []));
        assert.deepEqual(callIds, resultIds);
        assert.equal(windowed[windowed.length - 1], history[history.length - 1]);
    });

    it("keeps the same starting point while the conversation grows by a turn", () => {
        const before = windowHistory(history.slice(0, 40), 3000);
        const after = windowHistory(history.slice(0, 44), 3000);
        assert.equal(before[0], after[0]);
    });

    it("always keeps the latest turn, even if it alone is over budget", () => {
        const windowed = windowHistory([...history, ...turn(99, 5000)], 1000);
        assert.ok(windowed[0].role === "user" && windowed[0].content.startsWith("q99"));
    });
});

describe("budget split", () => {
    it("adds up to the total exactly", () => {
        const lines = splitBudget(40_000, [{ label: "Studio", percent: 35 }, { label: "Crew", percent: 35 }, { label: "Props", percent: 12 }, { label: "Food", percent: 8 }, { label: "Buffer", percent: 10 }]);
        assert.equal(lines.reduce((sum, line) => sum + line.amount, 0), 40_000);
        assert.equal(lines[0].amount, 14_000);
    });

    it("still adds up when the model's percentages don't total 100", () => {
        const lines = splitBudget(33_333, [{ label: "A", percent: 50 }, { label: "B", percent: 30 }, { label: "C", percent: 40 }]);
        assert.equal(lines.reduce((sum, line) => sum + line.amount, 0), 33_333);
    });

    it("gives nothing without a budget", () => {
        assert.deepEqual(splitBudget(0, [{ label: "A", percent: 100 }]), []);
        assert.deepEqual(splitBudget(10_000, []), []);
    });
});

describe("brief", () => {
    it("merges a patch without losing earlier facts", () => {
        const brief = mergeBrief({ city: "Delhi", hours: 4 }, { date: "2026-11-14", budget_per_hour: 2000 });
        assert.deepEqual(brief, { city: "Delhi", hours: 4, date: "2026-11-14", budgetPerHour: 2000 });
    });
});

describe("prompt and tools are stable", () => {
    it("produces identical bytes on every call", () => {
        assert.equal(conciergeSystemPrompt("web"), conciergeSystemPrompt("web"));
        assert.notEqual(conciergeSystemPrompt("web"), conciergeSystemPrompt("whatsapp"));
        assert.ok(conciergeSystemPrompt("web", { host: true }).length > conciergeSystemPrompt("web").length);
    });

    it("contains nothing that varies between requests", () => {
        const prompt = conciergeSystemPrompt("web");
        assert.ok(!/\b20\d\d-\d\d-\d\d\b/.test(prompt), "no dates in the system prompt");
    });

    it("every tool has a name, a description and an object schema", () => {
        const names = TOOL_DEFINITIONS.map((tool) => tool.name);
        assert.equal(new Set(names).size, names.length);
        for (const tool of TOOL_DEFINITIONS) {
            assert.match(tool.name, /^[a-z_]+$/);
            assert.ok(tool.description.length > 40, tool.name);
            assert.equal(tool.parameters.type, "object");
        }
    });
});
