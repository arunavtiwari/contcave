import "server-only";

import { redirect } from "next/navigation";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { adminHomeFor } from "@/constants/adminNav";
import { can, isStaff, type Permission } from "@/lib/user/permissions";

/** For admin pages: signed-out visitors go to the admin login, anyone without the permission to their own home. */
export async function requireAdminPage(permission?: Permission) {
    const currentUser = await getCurrentUser();
    if (!currentUser) redirect("/admin");
    const allowed = isStaff(currentUser.role) && (!permission || can(currentUser.role, permission));
    if (!allowed) redirect(adminHomeFor(currentUser.role));
    return currentUser;
}

/** For server functions called from admin pages; throws instead of redirecting. */
export async function requirePermission(permission: Permission) {
    const currentUser = await getCurrentUser();
    if (!currentUser || !can(currentUser.role, permission)) throw new Error("Unauthorized");
    return currentUser;
}
