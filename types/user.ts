import type { User } from "@prisma/client";

export type UserRole = "CUSTOMER" | "OWNER" | "ADMIN";
export const UserRole = {
    CUSTOMER: "CUSTOMER",
    OWNER: "OWNER",
    ADMIN: "ADMIN",
} as const;

export type SafeUser = Omit<
    User,
    | "createdAt"
    | "updatedAt"
    | "emailVerified"
    | "verified_at"
    | "markedForDeletionAt"
    | "role"
    | "hashedPassword"
    | "resetToken"
    | "resetTokenExpiry"
    | "emailVerificationCodeHash"
    | "emailVerificationCodeExpiry"
    | "paymentDetailsId"
    | "aadhaar_ref_id"
    | "aadhaar_last4"
    | "verified_via"
    | "verification_stage"
> & {
    createdAt: string;
    updatedAt: string;
    emailVerified: string | null;
    verified_at: string | null;
    markedForDeletionAt: string | null;
    role: UserRole;
};

export type PublicUser = Pick<
    SafeUser,
    | "id"
    | "name"
    | "image"
    | "profileImage"
    | "role"
    | "is_verified"
    | "googleCalendarConnected"
>;

export interface RegisterData {
    email: string;
    name: string;
    password: string;
    phone?: string;
    role?: UserRole;
}
