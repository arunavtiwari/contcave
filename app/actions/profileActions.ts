"use server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { UserService } from "@/lib/user/service";

export async function deleteAccount() {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser?.id || !currentUser?.email) throw new Error("Unauthorized");

        await UserService.deleteProfile(currentUser.email);

        return { success: true };
    } catch (error) {
        console.error('[deleteAccount] Error:', error);
        throw error;
    }
}
