import { z } from "zod";

import { UserRole } from "@/types/user";

export const userUpdateSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name is too long (max 100 characters)").optional(),
    description: z.string().max(1000, "Description is too long (max 1000 characters)").optional(),
    location: z.string().max(200, "Location is too long (max 200 characters)").optional(),
    languages: z
        .array(
            z.string().min(1, "Language cannot be empty").max(50, "Language name is too long")
        )
        .max(10, "Cannot exceed 10 languages")
        .optional(),
    title: z.string().max(100, "Title is too long (max 100 characters)").optional(),
    profileImage: z.string().url("Invalid URL").max(500, "Profile image URL is too long").nullable().optional(),
    phone: z.string().regex(/^\d{10}$/, "Enter a valid 10-digit mobile number").optional(),
    role: z.enum(["CUSTOMER", "OWNER", "ADMIN"]).optional(),
});

export const phoneUpdateSchema = z.object({
    phone: z.string().regex(/^\d{10}$/, "Enter a valid 10-digit mobile number"),
});

export type UserUpdateSchema = z.infer<typeof userUpdateSchema>;
export type PhoneUpdateSchema = z.infer<typeof phoneUpdateSchema>;

export const UserDataSchema = z.object({
    name: z.string().nullish().transform(val => val || ""),
    description: z.string().nullish().transform(val => val || ""),
    location: z.string().nullish().transform(val => val || ""),
    languages: z.array(z.string()).nullish().transform(val => val || []),
    title: z.string().nullish().transform(val => val || ""),
    email: z.string().nullish().transform(val => val || ""),
    phone: z.string().nullish().transform(val => val || ""),
    profileImage: z.string().nullish().transform(val => val || null),
    image: z.string().nullish().transform(val => val || null),
    role: z.nativeEnum(UserRole).nullish().transform(val => val || UserRole.CUSTOMER),
    is_verified: z.boolean().nullish().transform(val => !!val),
    createdAt: z.union([z.string(), z.number(), z.date()]).nullish().transform(val => {
        if (!val) return new Date().toISOString();
        return new Date(val).toISOString();
    }),
});

export type UserDataBoundaryPayload = z.infer<typeof UserDataSchema>;
