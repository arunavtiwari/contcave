import "server-only";

import { z } from "zod";

import { generateClaudeJson } from "@/lib/ai/claude";

import { CONCIERGE_TIMEOUT_MS, PLANNER_MAX_TOKENS } from "./config";
import { PLANNER_SYSTEM } from "./prompts";
import type { ConciergeBrief, ConciergeCard } from "./types";

type PlanCard = Extract<ConciergeCard, { type: "plan" }>;

const line = z.string().trim().min(1).max(140);

const planSchema = z.object({
    title: z.string().trim().min(1).max(80),
    schedule: z.array(z.object({ time: z.string().trim().min(1).max(30), what: line })).min(3).max(10),
    shots: z.array(line).min(3).max(12),
    checklist: z.array(line).min(3).max(12),
    budget_split: z.array(z.object({ label: z.string().trim().min(1).max(40), percent: z.number().min(0).max(100) })).max(8),
});

/**
 * Rupee amounts for a percentage split, worked out here rather than by the
 * model: whole rupees, rounded to the nearest ₹100, with the remainder put on
 * the last line so the lines always add up to the total exactly.
 */
export function splitBudget(total: number, split: { label: string; percent: number }[]): { label: string; amount: number }[] {
    const lines = split.filter((entry) => entry.percent > 0);
    const weight = lines.reduce((sum, entry) => sum + entry.percent, 0);
    if (total <= 0 || weight <= 0) return [];
    let allocated = 0;
    return lines.map((entry, index) => {
        const isLast = index === lines.length - 1;
        const amount = isLast ? total - allocated : Math.round((total * entry.percent) / weight / 100) * 100;
        allocated += amount;
        return { label: entry.label, amount };
    });
}

/**
 * The one tier-2 call. The planner gets the brief and nothing else: no chat history, no tools, no
 * studio data. A failed call or an invalid reply throws, so Spot tells the customer it couldn't
 * draft the plan instead of showing a generic one.
 */
export async function draftPlan(brief: ConciergeBrief): Promise<PlanCard> {
    const value = await generateClaudeJson({
        label: "concierge plan",
        system: PLANNER_SYSTEM,
        input: JSON.stringify(brief),
        schema: planSchema,
        timeoutMs: CONCIERGE_TIMEOUT_MS,
        maxTokens: PLANNER_MAX_TOKENS,
    });
    const plan = planSchema.parse(value);

    return {
        type: "plan",
        title: plan.title,
        schedule: plan.schedule,
        shots: plan.shots,
        checklist: plan.checklist,
        budget: brief.budgetTotal ? splitBudget(brief.budgetTotal, plan.budget_split) : [],
        budgetTotal: brief.budgetTotal ?? null,
    };
}
