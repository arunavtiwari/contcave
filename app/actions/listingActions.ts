"use server";

import { PaymentDetails } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createAction } from "@/lib/actions-utils";
import { ListingService } from "@/lib/listing/service";
import { decryptAndSanitizePaymentDetails } from "@/lib/payment-details";
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

type AdminListingStatus = "PENDING" | "VERIFIED" | "REJECTED";

type VerificationDocument = {
    url?: string;
    name?: string;
    original_filename?: string;
    bytes?: number;
    format?: string;
};

type AgreementPdf = {
    url?: string;
    pdfUrl?: string;
    public_id?: string;
};

function asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function normalizeVerifications(value: unknown) {
    const record = asRecord(value);
    const documents = Array.isArray(record.documents)
        ? record.documents
            .map((doc): VerificationDocument => {
                const item = asRecord(doc);
                return {
                    url: typeof item.url === "string" ? item.url : undefined,
                    name: typeof item.name === "string" ? item.name : undefined,
                    original_filename: typeof item.original_filename === "string" ? item.original_filename : undefined,
                    bytes: typeof item.bytes === "number" ? item.bytes : undefined,
                    format: typeof item.format === "string" ? item.format : undefined,
                };
            })
            .filter((doc) => doc.url || doc.name || doc.original_filename)
        : [];

    const agreement = asRecord(record.agreementPdf);
    const agreementPdf: AgreementPdf | null = agreement.url || agreement.pdfUrl
        ? {
            url: typeof agreement.url === "string" ? agreement.url : undefined,
            pdfUrl: typeof agreement.pdfUrl === "string" ? agreement.pdfUrl : undefined,
            public_id: typeof agreement.public_id === "string" ? agreement.public_id : undefined,
        }
        : null;

    return { documents, agreementPdf };
}

function maskReference(value: string | null | undefined, visible = 4) {
    if (!value) return null;
    if (value.length <= visible) return value;
    return `${"•".repeat(Math.min(6, value.length - visible))}${value.slice(-visible)}`;
}

export type AdminListingReview = Awaited<ReturnType<typeof getAdminListingReviews>>[number];

export async function getAdminListingReviews(status?: AdminListingStatus) {
    try {
        const listings = await prisma.listing.findMany({
            where: status ? { status } : {},
            include: {
                packages: { orderBy: { createdAt: "asc" } },
                sets: { orderBy: [{ position: "asc" }, { price: "asc" }] },
                user: { include: { paymentDetails: true } },
            },
            orderBy: { createdAt: "desc" },
        });

        return listings.map((listing) => {
            const paymentDetails = listing.user?.paymentDetails
                ? decryptAndSanitizePaymentDetails(listing.user.paymentDetails as PaymentDetails)
                : null;
            const verifications = normalizeVerifications(listing.verifications);

            return {
                id: listing.id,
                slug: listing.slug,
                title: listing.title,
                description: listing.description,
                imageSrc: listing.imageSrc,
                videoSrc: listing.videoSrc,
                category: listing.category,
                locationValue: listing.locationValue,
                actualLocation: listing.actualLocation,
                price: listing.price,
                status: listing.status,
                active: listing.active,
                createdAt: listing.createdAt.toISOString(),
                reviewedAt: listing.reviewedAt?.toISOString() || null,
                rejectionReason: listing.rejectionReason,
                amenities: listing.amenities,
                otherAmenities: listing.otherAmenities,
                addons: listing.addons,
                carpetArea: listing.carpetArea,
                operationalDays: listing.operationalDays,
                operationalHours: listing.operationalHours,
                minimumBookingHours: listing.minimumBookingHours,
                maximumPax: listing.maximumPax,
                instantBooking: listing.instantBooking,
                type: listing.type,
                customTerms: listing.customTerms,
                hasSets: listing.hasSets,
                setsHaveSamePrice: listing.setsHaveSamePrice,
                unifiedSetPrice: listing.unifiedSetPrice,
                additionalSetPricingType: listing.additionalSetPricingType,
                verifications,
                packages: listing.packages.map((pkg) => ({
                    id: pkg.id,
                    title: pkg.title,
                    description: pkg.description,
                    originalPrice: pkg.originalPrice,
                    offeredPrice: pkg.offeredPrice,
                    durationHours: pkg.durationHours,
                    features: pkg.features,
                    fixedAddOn: pkg.fixedAddOn,
                    requiredSetCount: pkg.requiredSetCount,
                    isActive: pkg.isActive,
                })),
                sets: listing.sets.map((set) => ({
                    id: set.id,
                    name: set.name,
                    description: set.description,
                    images: set.images,
                    price: set.price,
                    position: set.position,
                })),
                user: listing.user ? {
                    id: listing.user.id,
                    name: listing.user.name,
                    email: listing.user.email,
                    phone: listing.user.phone,
                    role: listing.user.role,
                    image: listing.user.image,
                    profileImage: listing.user.profileImage,
                    is_verified: listing.user.is_verified,
                    email_verified: listing.user.email_verified,
                    phone_verified: listing.user.phone_verified,
                    aadhaar_verified: listing.user.aadhaar_verified,
                    aadhaar_last4: listing.user.aadhaar_last4,
                    aadhaar_ref_id: maskReference(listing.user.aadhaar_ref_id),
                    bank_verified: listing.user.bank_verified,
                    bank_verified_name: listing.user.bank_verified_name,
                    verification_stage: listing.user.verification_stage,
                    verified_via: listing.user.verified_via,
                    verified_at: listing.user.verified_at?.toISOString() || null,
                    paymentDetails: paymentDetails ? {
                        accountHolderName: paymentDetails.accountHolderName,
                        bankName: paymentDetails.bankName,
                        accountNumber: paymentDetails.accountNumber,
                        ifscCode: maskReference(paymentDetails.ifscCode, 3),
                        companyName: paymentDetails.companyName,
                        gstin: paymentDetails.gstin,
                        cashfreeVendorId: paymentDetails.cashfreeVendorId,
                    } : null,
                } : null,
            };
        });
    } catch (error) {
        console.error("[getAdminListingReviews] Error:", error);
        return [];
    }
}

export async function getPendingListings() {
    return getAdminListingReviews("PENDING");
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

        revalidatePath(`/listings/${id}`);
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
    async (data, { user }) => {
        await ListingService.updateStatus(data.listingId, "VERIFIED", true, {
            reviewedById: user?.id,
            rejectionReason: null,
        });
        revalidatePath("/admin/dashboard/listings");
        revalidatePath("/properties");
        return { success: true };
    }
);

export const rejectListingAction = createAction(
    rejectListingSchema,
    { requireAuth: true, allowedRoles: ["ADMIN"] },
    async (data, { user }) => {
        await ListingService.updateStatus(data.listingId, "REJECTED", false, {
            reviewedById: user?.id,
            rejectionReason: data.reason,
        });
        revalidatePath("/admin/dashboard/listings");
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
