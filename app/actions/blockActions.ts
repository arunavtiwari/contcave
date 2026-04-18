"use server";



import getCurrentUser from "@/app/actions/getCurrentUser";
import { ListingService } from "@/lib/listing/service";

export interface CreateBlockData {
    date: string;
    startTime: string;
    endTime: string;
    setIds?: string[];
    reason?: string;
    [key: string]: unknown;
}

export async function getBlocks(listingId: string) {
    try {
        return await ListingService.getBlocks(listingId);
    } catch (error: unknown) {
        console.error('[getBlocks] Error:', error);
        return [];
    }
}

export async function createBlock(listingId: string, data: CreateBlockData) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser?.id) throw new Error("Unauthorized");
        return await ListingService.createBlock(currentUser.id, listingId, data);
    } catch (error: unknown) {
        console.error('[createBlock] Error:', error);
        throw error;
    }
}

export async function deleteBlock(listingId: string, blockId: string) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser?.id) throw new Error("Unauthorized");
        return await ListingService.deleteBlock(currentUser.id, listingId, blockId);
    } catch (error) {
        console.error('[deleteBlock] Error:', error);
        throw error;
    }
}
