"use server";

import { createAction } from "@/lib/actions-utils";
import { UserFacingError } from "@/lib/errors";
import { UserService } from "@/lib/user/service";
import { ownerEnableSchema, userUpdateSchema } from "@/schemas/user";
import { UserRole } from "@/types/user";

export const updateUser = createAction(
  userUpdateSchema,
  { requireAuth: true },
  async (userData, { user }) => {
    if (!user?.email) throw new UserFacingError("Your account email is unavailable.");
    return await UserService.updateProfile(user.email, userData);
  }
);

export const enableOwnerAction = createAction(
  ownerEnableSchema,
  { requireAuth: true, allowedRoles: [UserRole.CUSTOMER] },
  async (data, { user }) => {
    if (!user.email) throw new UserFacingError("Your account email is unavailable.");
    if (data.email.trim().toLowerCase() !== user.email.trim().toLowerCase()) {
      throw new UserFacingError("The email address does not match your account.");
    }
    return await UserService.enableOwner(user.id, user.email, data.phone);
  }
);
