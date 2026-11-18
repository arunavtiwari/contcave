import { z } from "zod";

import { STAFF_ROLES } from "@/lib/user/permissions";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid user ID");

export const inviteStaffSchema = z.object({
    name: z.string().trim().min(2, "Enter a name").max(80),
    email: z.string().trim().toLowerCase().email("Enter a valid email").max(254),
    role: z.enum(STAFF_ROLES),
});
export type InviteStaffInput = z.infer<typeof inviteStaffSchema>;

export const changeUserRoleSchema = z.object({
    userId: objectId,
    change: z.enum([...STAFF_ROLES, "revoke"]),
});

export const userIdSchema = z.object({ userId: objectId });
