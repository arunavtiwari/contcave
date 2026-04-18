"use server";

import { auth } from "@/auth";
import { UserService } from "@/lib/user/service";
import { UserUpdateSchema } from "@/schemas/user";
import { SafeUser } from "@/types/user";

export async function getSession() {
  return await auth();
}

export const updateUser = async (userData: UserUpdateSchema): Promise<SafeUser> => {
  try {
    const session = await getSession();
    if (!session?.user?.email) throw new Error("User not authenticated");

    return await UserService.updateProfile(session.user.email, userData);
  } catch (error: unknown) {
    console.error("Failed to update user:", error);
    throw error;
  }
};
