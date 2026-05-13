import { Prisma, User } from "@prisma/client";
import bcrypt from "bcryptjs";

import { UserFacingError } from "@/lib/errors";
import db from "@/lib/prismadb";
import { UserUpdateSchema, userUpdateSchema } from "@/schemas/user";
import { RegisterData, SafeUser } from "@/types/user";

export class UserService {
    static async findByEmail(email: string) {
        return await db.user.findUnique({ where: { email } });
    }

    static async findById(id: string) {
        return await db.user.findUnique({ where: { id } });
    }

    static async findByResetToken(token: string) {
        return await db.user.findFirst({
            where: {
                resetToken: token,
                resetTokenExpiry: { gt: new Date() }
            }
        });
    }

    static async createResetToken(userId: string, token: string, expiry: Date) {
        return await db.user.update({
            where: { id: userId },
            data: { resetToken: token, resetTokenExpiry: expiry }
        });
    }

    static async clearResetToken(userId: string) {
        return await db.user.update({
            where: { id: userId },
            data: { resetToken: null, resetTokenExpiry: null }
        });
    }

    static async register(data: RegisterData) {
        const { email, name, password, phone, role } = data;
        const normalizedEmail = email.trim().toLowerCase();
        const existingUser = await db.user.findUnique({
            where: { email: normalizedEmail },
            select: { id: true }
        });

        if (existingUser) {
            throw new UserFacingError("An account with this email already exists.");
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        try {
            return await db.user.create({
                data: {
                    email: normalizedEmail,
                    name: name.trim(),
                    hashedPassword,
                    phone: phone?.trim() || undefined,
                    role: role || "CUSTOMER"
                }
            });
        } catch (error) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2002" &&
                Array.isArray(error.meta?.target) &&
                error.meta.target.includes("email")
            ) {
                throw new UserFacingError("An account with this email already exists.");
            }

            throw error;
        }
    }

    /**
     * Unified user profile update with normalization and validation.
     */
    static async updateProfile(email: string, userData: UserUpdateSchema): Promise<SafeUser> {
        const validation = userUpdateSchema.safeParse(userData);
        if (!validation.success) throw new Error(validation.error.issues[0].message);

        const validData = validation.data;
        const updateData: Prisma.UserUpdateInput = {};
        const stringFields = ['name', 'title', 'location', 'phone', 'description'];

        Object.entries(validData).forEach(([key, value]) => {
            if (value !== undefined) {
                if (stringFields.includes(key) && value !== null) (updateData as Record<string, unknown>)[key] = String(value);
                else (updateData as Record<string, unknown>)[key] = value;
            }
        });

        if (Object.keys(updateData).length === 0) throw new Error("No valid fields to update");

        const updatedUser = await db.user.update({
            where: { email },
            data: updateData,
        });

        return this.serializeUser(updatedUser);
    }

    static async updatePassword(email: string, password: string) {
        const hashedPassword = await bcrypt.hash(password, 12);
        return await db.user.update({
            where: { email },
            data: { hashedPassword, resetToken: null, resetTokenExpiry: null }
        });
    }

    static async resetPasswordByToken(token: string, password: string) {
        const hashedPassword = await bcrypt.hash(password, 12);
        const result = await db.user.updateMany({
            where: {
                resetToken: token,
                resetTokenExpiry: { gt: new Date() }
            },
            data: {
                hashedPassword,
                resetToken: null,
                resetTokenExpiry: null
            }
        });

        if (result.count !== 1) {
            throw new Error("Invalid or expired reset token.");
        }

        return { success: true };
    }

    static async toggleFavorite(userId: string, listingId: string) {
        const user = await db.user.findUnique({
            where: { id: userId },
            select: { favoriteIds: true }
        });

        if (!user) throw new Error("User not found");

        let favoriteIds = [...(user.favoriteIds || [])];
        if (favoriteIds.includes(listingId)) {
            favoriteIds = favoriteIds.filter((id) => id !== listingId);
        } else {
            favoriteIds.push(listingId);
        }

        return await db.user.update({
            where: { id: userId },
            data: { favoriteIds }
        });
    }

    static async deleteProfile(email: string) {
        return await db.user.update({
            where: { email },
            data: {
                markedForDeletion: true,
                markedForDeletionAt: new Date(),
            }
        });
    }

    static async restoreProfile(id: string) {
        return await db.user.update({
            where: { id },
            data: {
                markedForDeletion: false,
                markedForDeletionAt: null,
            }
        });
    }

    static serializeUser(user: User): SafeUser {
        return {
            ...user,
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString(),
            emailVerified: user.emailVerified?.toISOString() || null,
            verified_at: user.verified_at?.toISOString() || null,
            markedForDeletionAt: user.markedForDeletionAt?.toISOString() || null,
            role: user.role,
        };
    }
}
