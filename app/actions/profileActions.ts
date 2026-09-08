"use server";

import { z } from "zod";

import { createAction } from "@/lib/actions-utils";
import { UserFacingError } from "@/lib/errors";
import { UserService } from "@/lib/user/service";

export const deleteAccount = createAction(
    z.undefined(),
    { requireAuth: true },
    async (_data, { user }) => {
        if (!user?.email) throw new UserFacingError("Your account email is unavailable.");
        await UserService.deleteProfile(user.email);
        return { success: true };
    }
);
