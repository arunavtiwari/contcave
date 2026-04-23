import { UserRole } from "@/types/user";

export const isOwner = (role?: UserRole | null) =>
    role === UserRole.OWNER || role === UserRole.ADMIN;

export const isAdmin = (role?: UserRole | null) =>
    role === UserRole.ADMIN;

export const isCustomer = (role?: UserRole | null) =>
    role === UserRole.CUSTOMER;

export const hasDashboardAccess = (role?: UserRole | null) =>
    isOwner(role);
