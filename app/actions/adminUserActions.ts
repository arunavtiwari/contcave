"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { createAction } from "@/lib/actions-utils";
import { requirePermission } from "@/lib/admin/guard";
import { roleAfter, roleChangeError, USER_ROLE_TABS, type UserRoleTab } from "@/lib/admin/userRoles";
import { USERS_PATH } from "@/lib/admin/usersHref";
import { containsText } from "@/lib/db/textSearch";
import { UserFacingError } from "@/lib/errors";
import prisma from "@/lib/prismadb";
import { sendPasswordLink } from "@/lib/user/passwordLink";
import { isStaff, rolesWith } from "@/lib/user/permissions";
import { changeUserRoleSchema, inviteStaffSchema, userIdSchema } from "@/schemas/adminUsers";
import { UserRole } from "@/types/user";
const MANAGE_USERS = { requireAuth: true, allowedRoles: rolesWith("users.manage") };

export type AdminUserRow = {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    role: UserRole;
    createdAt: string;
    hasPassword: boolean;
    listingCount: number;
};

export type AdminUsersPageData = {
    users: AdminUserRow[];
    total: number;
    page: number;
    pageSize: number;
    tab: UserRoleTab;
    tabCounts: Record<UserRoleTab, number>;
};

const ACTIVE_USER: Prisma.UserWhereInput = { markedForDeletion: false };

const tabWhere = (tab: UserRoleTab): Prisma.UserWhereInput => (tab === "all" ? {} : { role: tab });

export async function getAdminUsers(params: { tab: UserRoleTab; page: number; pageSize: number; search?: string }): Promise<AdminUsersPageData> {
    await requirePermission("users.manage");

    const page = Math.max(1, Math.floor(params.page) || 1);
    const pageSize = Math.min(100, Math.max(10, Math.floor(params.pageSize) || 20));
    const search = params.search?.trim();
    const insensitive = containsText(search ?? "");
    const searchWhere: Prisma.UserWhereInput = search
        ? { OR: [{ name: insensitive }, { email: insensitive }, { phone: insensitive }] }
        : {};
    const where: Prisma.UserWhereInput = { AND: [ACTIVE_USER, searchWhere, tabWhere(params.tab)] };

    const [rows, total, counts] = await Promise.all([
        prisma.user.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * pageSize,
            take: pageSize,
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                role: true,
                createdAt: true,
                hashedPassword: true,
                _count: { select: { listings: true } },
            },
        }),
        prisma.user.count({ where }),
        // One count per tab: groupBy on this Mongo setup is unreliable.
        Promise.all(USER_ROLE_TABS.map((tab) => prisma.user.count({ where: { AND: [ACTIVE_USER, searchWhere, tabWhere(tab)] } }))),
    ]);

    return {
        users: rows.map(({ hashedPassword, _count, createdAt, ...user }) => ({
            ...user,
            createdAt: createdAt.toISOString(),
            hasPassword: Boolean(hashedPassword),
            listingCount: _count.listings,
        })),
        total,
        page,
        pageSize,
        tab: params.tab,
        tabCounts: Object.fromEntries(USER_ROLE_TABS.map((tab, index) => [tab, counts[index]])) as Record<UserRoleTab, number>,
    };
}

export const inviteStaffUserAction = createAction(inviteStaffSchema, MANAGE_USERS, async ({ name, email, role }, { user: actor }) => {
    const existing = await prisma.user.findUnique({
        where: { email },
        select: { id: true, role: true, markedForDeletion: true, _count: { select: { listings: true } } },
    });

    if (existing?.markedForDeletion) throw new UserFacingError("This account is scheduled for deletion.");
    if (existing) {
        const adminCount = await prisma.user.count({ where: { ...ACTIVE_USER, role: UserRole.ADMIN } });
        const error = roleChangeError({ actorId: actor.id, target: existing, change: role, ownsListings: existing._count.listings > 0, adminCount });
        if (error) throw new UserFacingError(error);
    }

    const staff = existing
        ? await prisma.user.update({ where: { id: existing.id }, data: { role }, select: { id: true, name: true, email: true, hashedPassword: true } })
        : await prisma.user.create({ data: { name, email, role }, select: { id: true, name: true, email: true, hashedPassword: true } });

    const needsPassword = !staff.hashedPassword;
    const emailSent = needsPassword && staff.email
        ? await sendPasswordLink({ id: staff.id, name: staff.name, email: staff.email }, "invite")
        : false;

    revalidatePath(USERS_PATH);
    return { created: !existing, needsPassword, emailSent };
});

export const changeUserRoleAction = createAction(changeUserRoleSchema, MANAGE_USERS, async ({ userId, change }, { user: actor }) => {
    const [target, adminCount] = await Promise.all([
        prisma.user.findFirst({
            where: { id: userId, ...ACTIVE_USER },
            select: { id: true, role: true, _count: { select: { listings: true } } },
        }),
        prisma.user.count({ where: { ...ACTIVE_USER, role: UserRole.ADMIN } }),
    ]);
    if (!target) throw new UserFacingError("User not found.", 404);

    const ownsListings = target._count.listings > 0;
    const error = roleChangeError({ actorId: actor.id, target, change, ownsListings, adminCount });
    if (error) throw new UserFacingError(error);

    const role = roleAfter(change, ownsListings);
    await prisma.user.update({ where: { id: target.id }, data: { role } });

    revalidatePath(USERS_PATH);
    return { role };
});

export const resendStaffInviteAction = createAction(userIdSchema, MANAGE_USERS, async ({ userId }) => {
    const staff = await prisma.user.findFirst({
        where: { id: userId, ...ACTIVE_USER },
        select: { id: true, name: true, email: true, role: true },
    });
    if (!staff?.email || !isStaff(staff.role)) throw new UserFacingError("Only staff accounts get a setup email.");

    const emailSent = await sendPasswordLink({ id: staff.id, name: staff.name, email: staff.email }, "invite");
    if (!emailSent) throw new UserFacingError("The email couldn't be sent. Try again shortly.", 502);
    return { emailSent };
});
