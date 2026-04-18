"use server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/lib/prismadb";

interface UpdateListingPayload {
    imageSrc: string[];
    packages: Array<{
        id?: string;
        title: string;
        originalPrice: number;
        offeredPrice: number;
        features: string[];
        durationHours: number;
        requiredSetCount?: number | null;
    }>;
    hasSets: boolean;
    setsHaveSamePrice: boolean;
    unifiedSetPrice: number | null;
    additionalSetPricingType: string | null;
    sets: Array<{
        id?: string;
        name: string;
        description: string | null;
        images: string[];
        price: number | null;
        position: number;
    }>;
    [key: string]: unknown;
}

export default async function updateListing(listingId: string, payload: UpdateListingPayload) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser?.id) throw new Error("Unauthorized");

        const listing = await prisma.listing.findUnique({
            where: { id: listingId },
        });

        if (!listing || listing.userId !== currentUser.id) {
            throw new Error("Property not found or you don't have permission to update it");
        }

        const {
            imageSrc,
            hasSets,
            setsHaveSamePrice,
            unifiedSetPrice,
            additionalSetPricingType,
            sets: _sets,
            packages: _pkgs,
            blocks: _blocks,
            verifications: _verifications,
            user: _user,
            id: _id,
            createdAt: _createdAt,
            updatedAt: _updatedAt,
            ...rest
        } = payload;

        const updateData: Record<string, unknown> = {
            ...rest,
            imageSrc: imageSrc,
            hasSets: Boolean(hasSets),
            setsHaveSamePrice: Boolean(setsHaveSamePrice),
            unifiedSetPrice: unifiedSetPrice != null ? Math.round(Number(unifiedSetPrice)) : null,
            additionalSetPricingType: additionalSetPricingType || null,
        };

        if (updateData.carpetArea != null) updateData.carpetArea = String(updateData.carpetArea);
        if (updateData.minimumBookingHours != null) updateData.minimumBookingHours = String(updateData.minimumBookingHours);
        if (updateData.maximumPax != null) updateData.maximumPax = String(updateData.maximumPax);

        const updatedListing = await prisma.$transaction(async (tx) => {
            const result = await tx.listing.update({
                where: { id: listingId },
                data: updateData,
            });

            return result;
        });

        return updatedListing;
    } catch (error) {
        console.error('[updateListing] Error:', error);
        throw error;
    }
}
