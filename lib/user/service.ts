import { Prisma, User } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

import { UserFacingError } from "@/lib/errors";
import db from "@/lib/prismadb";
import { UserUpdateSchema, userUpdateSchema } from "@/schemas/user";
import { RegisterData, SafeUser } from "@/types/user";

export class UserService {
    private static hashResetToken(token: string) {
        return crypto.createHash("sha256").update(token.trim()).digest("hex");
    }

    static async findByEmail(email: string) {
        return await db.user.findUnique({ where: { email } });
    }

    static async findById(id: string) {
        return await db.user.findUnique({ where: { id } });
    }

    static async findByResetToken(token: string) {
        return await db.user.findFirst({
            where: {
                resetToken: this.hashResetToken(token),
                resetTokenExpiry: { gt: new Date() }
            }
        });
    }

    static async createResetToken(userId: string, token: string, expiry: Date) {
        return await db.user.update({
            where: { id: userId },
            data: { resetToken: this.hashResetToken(token), resetTokenExpiry: expiry }
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
            const user = await db.user.create({
                data: {
                    email: normalizedEmail,
                    name: name.trim(),
                    hashedPassword,
                    phone: phone?.trim() || undefined,
                    role: role || "CUSTOMER"
                }
            });
            return this.serializeUser(user);
        } catch (error) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2002"
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
        if (!validation.success) throw new UserFacingError(validation.error.issues[0]?.message || "Invalid profile update");

        const validData = validation.data;
        const updateData: Prisma.UserUpdateInput = {};
        const stringFields = ['name', 'title', 'location', 'phone', 'description'];
        const currentUser = await db.user.findUnique({
            where: { email },
            select: { phone: true, verified_via: true },
        });
        if (!currentUser) throw new UserFacingError("User not found", 404);

        Object.entries(validData).forEach(([key, value]) => {
            if (value !== undefined) {
                if (stringFields.includes(key) && value !== null) (updateData as Record<string, unknown>)[key] = String(value);
                else (updateData as Record<string, unknown>)[key] = value;
            }
        });

        if (validData.phone !== undefined && validData.phone !== currentUser.phone) {
            updateData.phone_verified = false;
            updateData.is_verified = false;
            updateData.verified_at = null;
            updateData.verified_via = {
                set: currentUser.verified_via.filter(
                    (method) => method !== "phone_profile_capture" && method !== "phone_profile_verification"
                ),
            };
        }

        if (Object.keys(updateData).length === 0) throw new UserFacingError("No valid fields to update");

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
        const hashedToken = this.hashResetToken(token);
        const result = await db.user.updateMany({
            where: {
                resetToken: hashedToken,
                resetTokenExpiry: { gt: new Date() }
            },
            data: {
                hashedPassword,
                resetToken: null,
                resetTokenExpiry: null
            }
        });

        if (result.count !== 1) {
            throw new UserFacingError("Invalid or expired reset token.");
        }

        return { success: true };
    }

    static async toggleFavorite(userId: string, listingId: string) {
        return await db.$transaction(async (tx) => {
            const user = await tx.user.findUnique({
                where: { id: userId },
                select: { favoriteIds: true },
            });
            if (!user) throw new UserFacingError("User not found");

            const isFavorite = user.favoriteIds.includes(listingId);
            if (!isFavorite) await this.assertFavoriteListing(tx, listingId);
            const favoriteIds = isFavorite
                ? user.favoriteIds.filter((id) => id !== listingId)
                : Array.from(new Set([...user.favoriteIds, listingId]));

            return await tx.user.update({ where: { id: userId }, data: { favoriteIds } });
        });
    }

    static async enableOwner(userId: string, email: string, phone: string): Promise<SafeUser> {
        const normalizedEmail = email.trim().toLowerCase();
        const user = await db.user.findFirst({
            where: { id: userId, email: normalizedEmail, markedForDeletion: false },
            select: { id: true, phone: true, verified_via: true },
        });
        if (!user) throw new UserFacingError("The email address does not match your account.");

        const normalizedPhone = phone.trim();
        const phoneChanged = normalizedPhone !== user.phone;

        const updatedUser = await db.user.update({
            where: { id: userId },
            data: {
                phone: normalizedPhone,
                role: "OWNER",
                ...(phoneChanged ? {
                    phone_verified: false,
                    is_verified: false,
                    verified_at: null,
                    verified_via: {
                        set: user.verified_via.filter(
                            (method) => method !== "phone_profile_capture" && method !== "phone_profile_verification"
                        ),
                    },
                } : {}),
            },
        });
        return this.serializeUser(updatedUser);
    }

    static async setFavorite(userId: string, listingId: string, shouldFavorite: boolean) {
        return await db.$transaction(async (tx) => {
            if (shouldFavorite) await this.assertFavoriteListing(tx, listingId);
            const user = await tx.user.findUnique({
                where: { id: userId },
                select: { favoriteIds: true },
            });
            if (!user) throw new UserFacingError("User not found");

            const favoriteIds = shouldFavorite
                ? Array.from(new Set([...user.favoriteIds, listingId]))
                : user.favoriteIds.filter((id) => id !== listingId);

            return await tx.user.update({ where: { id: userId }, data: { favoriteIds } });
        });
    }

    private static async assertFavoriteListing(tx: Prisma.TransactionClient, listingId: string) {
        if (!/^[a-f\d]{24}$/i.test(listingId)) {
            throw new UserFacingError("Invalid listing ID");
        }
        const listing = await tx.listing.findFirst({
            where: {
                id: listingId,
                active: true,
                status: "VERIFIED",
                OR: [{ archivedAt: null }, { archivedAt: { isSet: false } }],
            },
            select: { id: true },
        });
        if (!listing) throw new UserFacingError("Listing is not available");
    }

    static async deleteProfile(email: string) {
        const user = await db.user.findUnique({ where: { email }, select: { id: true } });
        if (!user) throw new UserFacingError("User not found", 404);

        return await db.$transaction(async (tx) => {
            const deactivatedAt = new Date();
            await tx.listing.updateMany({
                where: { userId: user.id, active: true },
                data: { active: false, accountDeactivatedAt: deactivatedAt },
            });
            return await tx.user.update({
                where: { id: user.id },
                data: { markedForDeletion: true, markedForDeletionAt: deactivatedAt },
            });
        });
    }

    static serializeUser(user: User): SafeUser {
        const {
            hashedPassword: _hashedPassword,
            resetToken: _resetToken,
            resetTokenExpiry: _resetTokenExpiry,
            emailVerificationCodeHash: _emailVerificationCodeHash,
            emailVerificationCodeExpiry: _emailVerificationCodeExpiry,
            paymentDetailsId: _paymentDetailsId,
            aadhaar_ref_id: _aadhaarRefId,
            aadhaar_last4: _aadhaarLast4,
            verified_via: _verifiedVia,
            verification_stage: _verificationStage,
            ...safeUser
        } = user;

        return {
            ...safeUser,
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString(),
            emailVerified: user.emailVerified?.toISOString() || null,
            verified_at: user.verified_at?.toISOString() || null,
            markedForDeletionAt: user.markedForDeletionAt?.toISOString() || null,
            role: user.role,
        };
    }
}
