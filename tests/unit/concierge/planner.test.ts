import { beforeEach, describe, expect, it, vi } from "vitest";

import { draftPlan } from "@/lib/concierge/planner";

const { generateClaudeJson } = vi.hoisted(() => ({ generateClaudeJson: vi.fn() }));
vi.mock("@/lib/ai/claude", () => ({ generateClaudeJson }));

const validPlan = {
    title: "Podcast shoot plan",
    schedule: [
        { time: "0:00–0:30", what: "Set up mics and lights" },
        { time: "0:30–1:30", what: "Record episode" },
        { time: "1:30–2:00", what: "Pack down" },
    ],
    shots: ["Wide two-shot", "Host close-up", "Guest close-up"],
    checklist: ["Spare batteries", "Headphones", "Water"],
    budget_split: [
        { label: "Studio", percent: 60 },
        { label: "Crew", percent: 40 },
    ],
};

describe("draftPlan", () => {
    beforeEach(() => generateClaudeJson.mockReset());

    it("turns Claude's plan into a card, with the rupee split worked out in code", async () => {
        generateClaudeJson.mockResolvedValue(validPlan);
        const card = await draftPlan({ shootType: "Podcast", hours: 2, budgetTotal: 10_000 });
        expect(card).toMatchObject({ type: "plan", title: "Podcast shoot plan", budgetTotal: 10_000 });
        expect(card.budget).toEqual([
            { label: "Studio", amount: 6_000 },
            { label: "Crew", amount: 4_000 },
        ]);
    });

    it("throws instead of inventing a plan when the reply is invalid", async () => {
        generateClaudeJson.mockResolvedValue({ ...validPlan, shots: [] });
        await expect(draftPlan({ hours: 2 })).rejects.toThrow();
    });

    it("throws when Claude can't be reached", async () => {
        generateClaudeJson.mockRejectedValueOnce(new Error("overloaded"));
        await expect(draftPlan({ hours: 2 })).rejects.toThrow("overloaded");
    });
});
