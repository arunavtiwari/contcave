import { UserRole } from "@/types/user";

export const isOwner = (role?: UserRole | string | null) =>
    role === UserRole.OWNER || role === UserRole.ADMIN || role === "OWNER" || role === "ADMIN";

export const isAdmin = (role?: UserRole | string | null) =>
    role === UserRole.ADMIN || role === "ADMIN";

export const isCustomer = (role?: UserRole | string | null) =>
    role === UserRole.CUSTOMER || role === "CUSTOMER";

export const hasDashboardAccess = (role?: UserRole | string | null) =>
    isOwner(role);
