import { STAFF_ROLES, type StaffRole } from "@/lib/user/permissions";
import { UserRole } from "@/types/user";

export const ROLE_LABELS: Record<UserRole, string> = {
    CUSTOMER: "Customer",
    OWNER: "Owner",
    ADMIN: "Admin",
    FINANCE: "Finance",
};

export const USER_ROLE_TABS = ["all", ...STAFF_ROLES, UserRole.OWNER, UserRole.CUSTOMER] as const;
export type UserRoleTab = (typeof USER_ROLE_TABS)[number];

export const userRoleTabOf = (value: unknown): UserRoleTab =>
    USER_ROLE_TABS.find((tab) => tab === value) ?? "all";

/** Grant a staff role, or take staff access away. */
export type RoleChange = StaffRole | "revoke";

/** Without staff access a studio owner stays an owner; everyone else becomes a customer. */
export const roleAfter = (change: RoleChange, ownsListings: boolean): UserRole =>
    change === "revoke" ? (ownsListings ? UserRole.OWNER : UserRole.CUSTOMER) : change;

type RoleChangeCheck = {
    actorId: string;
    target: { id: string; role: UserRole };
    change: RoleChange;
    ownsListings: boolean;
    adminCount: number;
};

/** Why a role change isn't allowed, or null when it is. */
export function roleChangeError({ actorId, target, change, ownsListings, adminCount }: RoleChangeCheck): string | null {
    const next = roleAfter(change, ownsListings);
    if (target.id === actorId) return "You can't change your own role.";
    if (next === target.role) return `This user is already ${ROLE_LABELS[next].toLowerCase()}.`;
    if (target.role === UserRole.ADMIN && adminCount <= 1) return "Keep at least one admin.";
    if (next === UserRole.FINANCE && ownsListings) {
        return "This account owns studios. Use a separate email for finance access.";
    }
    return null;
}
