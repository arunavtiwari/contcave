import { UserRole } from "@/types/user";

export const isOwner = (role?: UserRole | null) =>
    role === UserRole.OWNER || role === UserRole.ADMIN;

export const isAdmin = (role?: UserRole | null) =>
    role === UserRole.ADMIN;

export const isCustomer = (role?: UserRole | null) =>
    role === UserRole.CUSTOMER;

export const hasDashboardAccess = (role?: UserRole | null) =>
    isOwner(role);

/** What a staff member may do in the admin panel. ADMIN holds every permission. */
export type Permission =
    | "listings.manage"
    | "bookings.view"
    | "bookings.manage"
    | "documents.view"
    | "owners.manage"
    | "logs.view"
    | "users.manage";

const FINANCE_PERMISSIONS: ReadonlySet<Permission> = new Set(["bookings.view", "documents.view"]);

export function can(role: UserRole | null | undefined, permission: Permission): boolean {
    if (role === UserRole.ADMIN) return true;
    if (role === UserRole.FINANCE) return FINANCE_PERMISSIONS.has(permission);
    return false;
}

/** Roles that sign in to the admin panel. */
export const STAFF_ROLES = [UserRole.ADMIN, UserRole.FINANCE] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const isStaff = (role?: UserRole | null): role is StaffRole =>
    STAFF_ROLES.some((staffRole) => staffRole === role);

/** For `createAction({ allowedRoles })`: every role holding the permission. */
export const rolesWith = (permission: Permission): UserRole[] =>
    STAFF_ROLES.filter((role) => can(role, permission));
