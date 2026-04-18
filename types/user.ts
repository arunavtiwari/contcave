import { User } from "@prisma/client";

export type SafeUser = Omit<
    User,
    "createdAt" | "updatedAt" | "emailVerified" | "verified_at" | "markedForDeletionAt"
> & {
    createdAt: string;
    updatedAt: string;
    emailVerified: string | null;
    verified_at: string | null;
    googleCalendarConnected: boolean;
    markedForDeletion: boolean;
    markedForDeletionAt: string | null;
    aadhaar_last4: string | null;
};

export interface RegisterData {
    email: string;
    name: string;
    password: string;
    phone?: string;
    is_owner?: boolean;
}
