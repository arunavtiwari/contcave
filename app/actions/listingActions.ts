"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createAction } from "@/lib/actions-utils";
import { ListingService } from "@/lib/listing/service";
import prisma from "@/lib/prismadb";
import { dayStatusSchema } from "@/schemas/dayStatus";
import {
    approveListingSchema,
    deleteBlockSchema,
    deleteListingSchema,
    listingBaseSchema,
    listingBlockSchema,
    listingSchema,
    rejectListingSchema
} from "@/schemas/listing";

/**
 * Public Data Fetchers (Read-only, no wrapper needed)
 */

export async function getPendingListings() {
    try {
        const pendingListings = await prisma.listing.findMany({
            where: { status: 'PENDING' },
            select: {
                id: true,
                title: true,
                imageSrc: true,
                locationValue: true,
                category: true,
                price: true,
                createdAt: true,
                user: {
                    select: { name: true, email: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        return pendingListings;
    } catch (error) {
        console.error("[getPendingListings] Error:", error);
        return [];
    }
}

export async function getBlocksAction(listingId: string) {
    try {
        return await ListingService.getBlocks(listingId);
    } catch (error) {
        console.error("[getBlocksAction] Error:", error);
        return [];
    }
}

export async function getDayStatusAction(listingId: string, date: string) {
    try {
        if (!listingId || !date) return null;
        const parsedDate = new Date(date);
        if (isNaN(parsedDate.getTime())) return null;

        return await prisma.dayStatus.findUnique({
            where: {
                listingId_date: { listingId, date: parsedDate }
            },
        });
    } catch (error) {
        console.error("[getDayStatusAction] Error:", error);
        return null;
    }
}

/**
 * Enterprise Mutations (Wrapped with createAction)
 */

export const createListingAction = createAction(
    listingSchema,
    { requireAuth: true, allowedRoles: ["OWNER", "ADMIN"] },
    async (data, { user }) => {
        const listing = await ListingService.createListing(user!.id, data);
        revalidatePath("/properties");
        return listing;
    }
);

export const updateListingAction = createAction(
    listingBaseSchema.partial().extend({ id: z.string().min(1) }),
    { requireAuth: true, allowedRoles: ["OWNER", "ADMIN"] },
    async (data, { user }) => {
        const { id, ...updateData } = data;
        const listing = await ListingService.updateListing(user!.id, id, updateData);

        revalidatePath(`/listing/${id}`);
        revalidatePath("/properties");
        revalidatePath("/dashboard/properties");

        return listing;
    }
);

export const deleteListingAction = createAction(
    deleteListingSchema,
    { requireAuth: true, allowedRoles: ["OWNER", "ADMIN"] },
    async (data, { user }) => {
        await ListingService.deleteListing(user!.id, data.listingId);
        revalidatePath("/properties");
        revalidatePath("/dashboard/properties");
        return { success: true };
    }
);

export const approveListingAction = createAction(
    approveListingSchema,
    { requireAuth: true, allowedRoles: ["ADMIN"] },
    async (data) => {
        await ListingService.updateStatus(data.listingId, "VERIFIED", true);
        revalidatePath("/dashboard/listings");
        revalidatePath("/properties");
        return { success: true };
    }
);

export const rejectListingAction = createAction(
    rejectListingSchema,
    { requireAuth: true, allowedRoles: ["ADMIN"] },
    async (data) => {
        await ListingService.updateStatus(data.listingId, "REJECTED", false);
        revalidatePath("/dashboard/listings");
        return { success: true };
    }
);

export const createBlockAction = createAction(
    listingBlockSchema,
    { requireAuth: true, allowedRoles: ["OWNER", "ADMIN"] },
    async (data, { user }) => {
        const { listingId, ...blockData } = data;
        await ListingService.createBlock(user!.id, listingId, blockData);
        revalidatePath(`/listings/${listingId}`);
        return { success: true };
    }
);

export const deleteBlockAction = createAction(
    deleteBlockSchema,
    { requireAuth: true, allowedRoles: ["OWNER", "ADMIN"] },
    async (data, { user }) => {
        await ListingService.deleteBlock(user!.id, data.listingId, data.blockId);
        revalidatePath(`/listings/${data.listingId}`);
        return { success: true };
    }
);

export const updateDayStatusAction = createAction(
    dayStatusSchema,
    { requireAuth: true, allowedRoles: ["OWNER", "ADMIN"] },
    async (data, { user }) => {
        const { listingId, date, listingActive, startTime, endTime } = data;
        const parsedDate = new Date(date);

        const listing = await prisma.listing.findUnique({
            where: { id: listingId },
            select: { userId: true },
        });

        if (!listing || (listing.userId !== user!.id && user!.role !== "ADMIN")) {
            throw new Error("Permission denied or listing not found");
        }

        await prisma.dayStatus.upsert({
            where: { listingId_date: { listingId, date: parsedDate } },
            update: {
                listingActive,
                startTime: startTime || "",
                endTime: endTime || ""
            },
            create: {
                listingId,
                date: parsedDate,
                listingActive,
                startTime: startTime || "",
                endTime: endTime || ""
            },
        });

        revalidatePath(`/listings/${listingId}`);
        return { success: true };
    }
);
// Compatibility Aliases
export const updateListing = updateListingAction;
export const deleteListing = deleteListingAction;
export const createBlock = createBlockAction;
export const deleteBlock = deleteBlockAction;
