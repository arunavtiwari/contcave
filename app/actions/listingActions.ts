"use server";

import { revalidatePath } from "next/cache";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { ListingService } from "@/lib/listing/service";
import prisma from "@/lib/prismadb";
import { isAdmin, isOwner } from "@/lib/user/permissions";
import { dayStatusSchema } from "@/schemas/dayStatus";
import { listingBaseSchema, ListingSchema, listingSchema } from "@/schemas/listing";
import type { FullListing } from "@/types/listing";

/**
 * Standardized Action Response
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ActionResponse<T = any> = {
    success: boolean;
    data?: T;
    error?: string;
};

// Create a listing
export async function createListingAction(body: ListingSchema): Promise<ActionResponse<FullListing>> {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser?.id) return { success: false, error: "Unauthorized" };

        if (!isOwner(currentUser.role)) {
            return { success: false, error: "Only owners can create listings" };
        }

        const validation = listingSchema.safeParse(body);
        if (!validation.success) {
            return { success: false, error: validation.error.issues[0].message };
        }

        const listing = await ListingService.createListing(currentUser.id, validation.data);

        revalidatePath("/properties");
        return { success: true, data: listing };
    } catch (error) {
        console.error("[createListingAction] Error:", error);
        return { success: false, error: "Failed to create listing" };
    }
}

// Update a listing
export async function updateListingAction(listingId: string, body: Partial<ListingSchema>): Promise<ActionResponse<FullListing>> {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser?.id) return { success: false, error: "Unauthorized" };

        const updateSchema = listingBaseSchema.partial();
        const validation = updateSchema.safeParse(body);
        if (!validation.success) {
            return { success: false, error: validation.error.issues[0].message };
        }

        const listing = await ListingService.updateListing(currentUser.id, listingId, validation.data);

        revalidatePath(`/listing/${listingId}`);
        revalidatePath("/properties");
        revalidatePath("/dashboard/properties");

        return { success: true, data: listing };
    } catch (error) {
        console.error("[updateListingAction] Error:", error);
        return { success: false, error: "Failed to update listing" };
    }
}

// Delete a listing
export async function deleteListingAction(listingId: string): Promise<ActionResponse> {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser?.id) return { success: false, error: "Unauthorized" };

        await ListingService.deleteListing(currentUser.id, listingId);

        revalidatePath("/properties");
        revalidatePath("/dashboard/properties");
        return { success: true };
    } catch (error) {
        console.error("[deleteListingAction] Error:", error);
        return { success: false, error: "Failed to delete listing" };
    }
}

// Approve a listing (Admin)
export async function approveListingAction(listingId: string): Promise<ActionResponse> {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser?.id || !isAdmin(currentUser.role)) return { success: false, error: "Unauthorized" };

        await ListingService.updateStatus(listingId, "VERIFIED", true);

        revalidatePath("/dashboard/listings");
        revalidatePath("/properties");
        return { success: true };
    } catch (error) {
        console.error("[approveListingAction] Error:", error);
        return { success: false, error: "Failed to approve listing" };
    }
}

// Reject a listing (Admin)
export async function rejectListingAction(listingId: string): Promise<ActionResponse> {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser?.id || !isAdmin(currentUser.role)) return { success: false, error: "Unauthorized" };

        await ListingService.updateStatus(listingId, "REJECTED", false);

        revalidatePath("/dashboard/listings");
        return { success: true };
    } catch (error) {
        console.error("[rejectListingAction] Error:", error);
        return { success: false, error: "Failed to reject listing" };
    }
}

// Fetch pending listings (Admin)
export async function getPendingListings() {
    try {
        const currentUser = await getCurrentUser();
        if (!isAdmin(currentUser?.role)) return [];

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

// Fetch blocks for a listing
export async function getBlocksAction(listingId: string) {
    try {
        return await ListingService.getBlocks(listingId);
    } catch (error) {
        console.error("[getBlocksAction] Error:", error);
        return [];
    }
}

// Create a block for a listing
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createBlockAction(listingId: string, data: any): Promise<ActionResponse> {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser?.id) return { success: false, error: "Unauthorized" };

        await ListingService.createBlock(currentUser.id, listingId, data);
        revalidatePath(`/listings/${listingId}`);
        return { success: true };
    } catch (error) {
        console.error("[createBlockAction] Error:", error);
        return { success: false, error: "Failed to create block" };
    }
}

// Delete a block
export async function deleteBlockAction(listingId: string, blockId: string): Promise<ActionResponse> {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser?.id) return { success: false, error: "Unauthorized" };

        await ListingService.deleteBlock(currentUser.id, listingId, blockId);
        revalidatePath(`/listings/${listingId}`);
        return { success: true };
    } catch (error) {
        console.error("[deleteBlockAction] Error:", error);
        return { success: false, error: "Failed to delete block" };
    }
}

// Fetch day status for a listing
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

// Update day status (availability/hours)
export async function updateDayStatusAction(data: {
    listingId: string;
    date: string;
    listingActive: boolean;
    startTime: string;
    endTime: string;
}): Promise<ActionResponse> {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser?.id) return { success: false, error: "Unauthorized" };

        const validation = dayStatusSchema.safeParse(data);
        if (!validation.success) {
            return { success: false, error: validation.error.issues[0].message };
        }

        const { listingId, date, listingActive, startTime, endTime } = validation.data;
        const parsedDate = new Date(date);

        const listing = await prisma.listing.findUnique({
            where: { id: listingId },
            select: { userId: true },
        });

        if (!listing || listing.userId !== currentUser.id) {
            return { success: false, error: "Permission denied" };
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
    } catch (error) {
        console.error("[updateDayStatusAction] Error:", error);
        return { success: false, error: "Failed to update day status" };
    }
}
