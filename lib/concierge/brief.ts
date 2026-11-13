import { z } from "zod";

import { isDateKey } from "@/lib/booking/dayAvailability";

import type { ConciergeBrief } from "./types";

/** What update_brief accepts. Unknown keys are dropped; bad values are ignored field by field. */
export const briefPatchSchema = z.object({
    city: z.string().trim().min(2).max(60).optional(),
    date: z.string().refine(isDateKey, "Use YYYY-MM-DD").optional(),
    shoot_type: z.string().trim().min(2).max(60).optional(),
    hours: z.number().min(1).max(24).optional(),
    people: z.number().int().min(1).max(500).optional(),
    budget_total: z.number().int().min(0).max(100_000_000).optional(),
    budget_per_hour: z.number().int().min(0).max(1_000_000).optional(),
    aesthetics: z.array(z.string().trim().min(2).max(40)).max(6).optional(),
    notes: z.string().trim().max(300).optional(),
});

export type BriefPatch = z.infer<typeof briefPatchSchema>;

export function mergeBrief(current: ConciergeBrief | null | undefined, patch: BriefPatch): ConciergeBrief {
    const next: ConciergeBrief = { ...(current ?? {}) };
    if (patch.city !== undefined) next.city = patch.city;
    if (patch.date !== undefined) next.date = patch.date;
    if (patch.shoot_type !== undefined) next.shootType = patch.shoot_type;
    if (patch.hours !== undefined) next.hours = patch.hours;
    if (patch.people !== undefined) next.people = patch.people;
    if (patch.budget_total !== undefined) next.budgetTotal = patch.budget_total;
    if (patch.budget_per_hour !== undefined) next.budgetPerHour = patch.budget_per_hour;
    if (patch.aesthetics !== undefined) next.aesthetics = patch.aesthetics;
    if (patch.notes !== undefined) next.notes = patch.notes;
    return next;
}

export const isBriefEmpty = (brief: ConciergeBrief | null | undefined) =>
    !brief || Object.values(brief).every((value) => value === undefined || value === "" || (Array.isArray(value) && value.length === 0));
