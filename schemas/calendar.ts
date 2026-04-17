import { z } from "zod";

export const updateEventSchema = z.object({
    eventId: z.string().min(1, "Event ID is required"),
    summary: z.string().optional(),
    description: z.string().optional(),
    startDateTime: z.string().datetime("Invalid start date/time format"),
    endDateTime: z.string().datetime("Invalid end date/time format"),
    isAllDay: z.boolean().optional(),
});

export type UpdateEventSchema = z.infer<typeof updateEventSchema>;
