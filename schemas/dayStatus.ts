import { z } from "zod";

import { objectIdSchema } from "@/schemas/common";

export const dayStatusSchema = z.object({
    listingId: objectIdSchema,
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)").refine((value) => {
        const parsed = new Date(`${value}T00:00:00.000Z`);
        return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
    }, "Invalid calendar date"),
    listingActive: z.boolean(),
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)").nullable().optional(),
    endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)").nullable().optional(),
}).superRefine((data, ctx) => {
    if (data.listingActive && (!data.startTime || !data.endTime)) {
        ctx.addIssue({
            code: "custom",
            message: "Start and end time are required for an active day",
            path: [!data.startTime ? "startTime" : "endTime"],
        });
        return;
    }
    if (Boolean(data.startTime) !== Boolean(data.endTime)) {
        ctx.addIssue({
            code: "custom",
            message: "Start and end time must be provided together",
            path: [!data.startTime ? "startTime" : "endTime"],
        });
        return;
    }
    if (data.startTime && data.endTime) {
        const [startHour, startMinute] = data.startTime.split(":").map(Number);
        const [endHour, endMinute] = data.endTime.split(":").map(Number);
        const start = startHour * 60 + startMinute;
        const rawEnd = endHour * 60 + endMinute;
        const end = rawEnd === 0 ? 24 * 60 : rawEnd;
        if (end <= start) {
            ctx.addIssue({
                code: "custom",
                message: "End time must be after start time",
                path: ["endTime"],
            });
        }
    }
});

export type DayStatusSchema = z.infer<typeof dayStatusSchema>;
