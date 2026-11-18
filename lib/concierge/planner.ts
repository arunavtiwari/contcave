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

const hhmm = (minutes: number) => `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;

/** A sensible generic plan, used when the model call fails. */
function templatePlan(brief: ConciergeBrief): z.infer<typeof planSchema> {
    // Blocks land on quarter hours so the day reads like a call sheet.
    const quarter = (minutes: number) => Math.max(15, Math.round(minutes / 15) * 15);
    const total = Math.round((brief.hours ?? 4) * 60);
    const setup = Math.min(45, quarter(total * 0.15));
    const wrap = Math.min(30, quarter(total * 0.1));
    const shooting = total - setup - wrap;
    const first = quarter(shooting * 0.45);
    const breakLength = total >= 240 ? 15 : 0;
    const second = shooting - first - breakLength;
    const block = (start: number, length: number) => `${hhmm(start)}–${hhmm(start + length)}`;
    let at = 0;
    const schedule = [
        { time: block(at, setup), what: "Load in, set lights and backdrop, test frames" },
        { time: block((at += setup), first), what: "First look: the must-have shots while everyone is fresh" },
        ...(breakLength ? [{ time: block((at += first), breakLength), what: "Short break, review selects, reset the set" }] : []),
        { time: block((at += breakLength || first), second), what: "Second look and variations, details and close-ups" },
        { time: block((at += second), wrap), what: "Final review, pack down, leave the studio as found" },
    ];
    const what = brief.shootType ?? "Studio";
    return {
        title: `${what} shoot plan`.slice(0, 80),
        schedule,
        shots: [
            "Hero shot: the one image the shoot is for",
            "Wide frame showing the full setup",
            "Three-quarter angle with the key light",
            "Detail and texture close-ups",
            "A vertical version of the hero for reels and stories",
            "One safe alternative on a plain background",
        ],
        checklist: [
            "Shot list and references, printed or saved offline",
            "Spare batteries, memory cards and a card reader",
            "Tethering cable and laptop, if shooting tethered",
            "Gaffer tape, clamps and a steamer",
            "Props, styling and a backup of anything fragile",
            "Water and food for the team",
            "Releases for anyone appearing on camera",
        ],
        budget_split: brief.budgetTotal
            ? [
                  { label: "Studio", percent: 35 },
                  { label: "Photographer or crew", percent: 35 },
                  { label: "Styling and props", percent: 12 },
                  { label: "Food and travel", percent: 8 },
                  { label: "Buffer", percent: 10 },
              ]
            : [],
    };
}

/**
 * The one tier-2 call. The planner gets the brief and nothing else: no chat
 * history, no tools, no studio data. Falls back to a template when the call
 * fails or the reply is not a valid plan, so the customer always gets a plan.
 */
export async function draftPlan(brief: ConciergeBrief): Promise<{ card: PlanCard; source: "model" | "template" }> {
    let plan: z.infer<typeof planSchema> | null = null;
    let source: "model" | "template" = "template";

    try {
        const value = await generateClaudeJson({
            label: "concierge plan",
            system: PLANNER_SYSTEM,
            input: JSON.stringify(brief),
            schema: planSchema,
            timeoutMs: CONCIERGE_TIMEOUT_MS,
            maxTokens: PLANNER_MAX_TOKENS,
        });
        const parsed = planSchema.safeParse(value);
        if (parsed.success) {
            plan = parsed.data;
            source = "model";
        }
    } catch (error) {
        console.error("[concierge] planner failed, using template", error instanceof Error ? error.message : error);
    }
    plan ??= templatePlan(brief);

    return {
        source,
        card: {
            type: "plan",
            title: plan.title,
            schedule: plan.schedule,
            shots: plan.shots,
            checklist: plan.checklist,
            budget: brief.budgetTotal ? splitBudget(brief.budgetTotal, plan.budget_split) : [],
            budgetTotal: brief.budgetTotal ?? null,
        },
    };
}
