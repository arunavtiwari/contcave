import { User } from "@prisma/client";

export type UserRole = "CUSTOMER" | "OWNER" | "ADMIN";
export const UserRole = {
    CUSTOMER: "CUSTOMER",
    OWNER: "OWNER",
    ADMIN: "ADMIN",
} as const;

export type SafeUser = Omit<
    User,
    "createdAt" | "updatedAt" | "emailVerified" | "verified_at" | "markedForDeletionAt" | "role"
> & {
    createdAt: string;
    updatedAt: string;
    emailVerified: string | null;
    verified_at: string | null;
    markedForDeletionAt: string | null;
    role: UserRole;
};

export interface RegisterData {
    email: string;
    name: string;
    password: string;
    phone?: string;
    role?: UserRole;
}
