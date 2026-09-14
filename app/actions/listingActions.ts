"use server";

import { PaymentDetails } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { getGstStateCodeFromStateName } from "@/constants/gstStateCodes";
import { createAction } from "@/lib/actions-utils";
import { UserFacingError } from "@/lib/errors";
import { ListingService } from "@/lib/listing/service";
import { decryptAndSanitizePaymentDetails } from "@/lib/payment-details";
import prisma from "@/lib/prismadb";
import { rateLimitRequest } from "@/lib/security/rateLimit";
import { objectIdSchema } from "@/schemas/common";
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

function normalizeVerifications(value: unknown, listingId: string) {
    const record = asRecord(value);
    const documents = Array.isArray(record.documents)
        ? record.documents
            .map((doc, index): VerificationDocument => {
                const item = asRecord(doc);
                const hasStoredDocument = typeof item.storageRef === "string";
                return {
                    url: hasStoredDocument ? `/api/documents/listings/${listingId}/verification/${index}` : undefined,
                    name: typeof item.name === "string" ? item.name : undefined,
                    original_filename: typeof item.original_filename === "string" ? item.original_filename : undefined,
                    bytes: typeof item.bytes === "number" ? item.bytes : undefined,
                    format: typeof item.format === "string" ? item.format : undefined,
                };
            })
            .filter((doc) => doc.url || doc.name || doc.original_filename)
        : [];

    const agreement = asRecord(record.agreementPdf);
    const agreementPdf: AgreementPdf | null = typeof agreement.storageRef === "string"
        ? {
            url: `/api/documents/listings/${listingId}/agreement/0`,
            pdfUrl: `/api/documents/listings/${listingId}/agreement/0`,
        }
        : null;

    return { documents, agreementPdf };
}

function maskReference(value: string | null | undefined, visible = 4) {
    if (!value) return null;
    if (value.length <= visible) return value;
    return `${"•".repeat(Math.min(6, value.length - visible))}${value.slice(-visible)}`;
}

import getAmenities from "@/app/actions/getAmenities";

export type AdminListingReview = Awaited<ReturnType<typeof getAdminListingReviews>>[number];

export type AdminListingReviewSummary = {
    id: string;
    slug: string | null;
    title: string;
    imageSrc: string[];
    category: string;
    locationValue: string;
    price: number | null;
    status: AdminListingStatus;
    createdAt: string;
    listingType: "STANDARD" | "CURATED";
    enquiryCount: number | null;
    inConversation: boolean;
    notifyEmailSentAt: string | null;
    notifyReminderAt: string | null;
    user: {
        name: string | null;
        email: string | null;
        is_verified: boolean;
    } | null;
};

export type AdminListingReviewPage = {
    listings: AdminListingReviewSummary[];
    page: number;
    pageSize: number;
    total: number;
    counts: Record<"ALL" | AdminListingStatus, number>;
    curatedTotal: number;
};

export async function getAdminListingReviews(status?: AdminListingStatus, listingId?: string) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || currentUser.role !== "ADMIN") {
            throw new UserFacingError("Unauthorized", 403);
        }

        const hydratableIds = listingId
            ? [listingId]
            : await ListingService.getHydratableListingIds(status ? { status } : {});
        if (hydratableIds.length === 0) return [];

        const [listings, allAmenities] = await Promise.all([
            prisma.listing.findMany({
                where: {
                    ...(status ? { status } : {}),
                    OR: [{ archivedAt: null }, { archivedAt: { isSet: false } }],
                    id: { in: hydratableIds },
                },
                include: {
                    packages: { orderBy: { createdAt: "asc" } },
                    sets: { orderBy: [{ position: "asc" }, { price: "asc" }] },
                    user: { include: { paymentDetails: true } },
                },
                orderBy: { createdAt: "desc" },
            }),
            getAmenities(),
        ]);

        const amenityMap = new Map(allAmenities.map(a => [String(a.id), a.name]));

        return listings.map((listing) => {
            let paymentDetails = null;
            if (listing.user?.paymentDetails) {
                try {
                    paymentDetails = decryptAndSanitizePaymentDetails(listing.user.paymentDetails as PaymentDetails);
                } catch (error) {
                    console.error(`[AdminListings] Failed to decrypt payment details for listing ${listing.id}:`, error);
                }
            }
            const verifications = normalizeVerifications(listing.verifications, listing.id);

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
                amenities: listing.amenities.map(id => amenityMap.get(String(id)) || id),
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
                listingType: listing.listingType,
                priceRangeMin: listing.priceRangeMin,
                priceRangeMax: listing.priceRangeMax,
                enquiryCount: listing.enquiryCount,
                inConversation: listing.inConversation,
                notifyEmailSentAt: listing.notifyEmailSentAt?.toISOString() ?? null,
                notifyReminderAt: listing.notifyReminderAt?.toISOString() ?? null,
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
        throw error;
    }
}

export async function getAdminListingReviewPage(params: {
    page?: number;
    pageSize?: number;
    status?: AdminListingStatus;
    listingType?: "STANDARD" | "CURATED";
} = {}): Promise<AdminListingReviewPage> {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "ADMIN") throw new UserFacingError("Unauthorized", 403);

    const page = typeof params.page === "number" && Number.isFinite(params.page)
        ? Math.max(1, Math.floor(params.page))
        : 1;
    const pageSize = typeof params.pageSize === "number" && Number.isFinite(params.pageSize)
        ? Math.min(100, Math.max(10, Math.floor(params.pageSize)))
        : 10;
    const listingType = params.listingType || "STANDARD";
    const [pageData, countData, curatedCountData] = await Promise.all([
        ListingService.getHydratableListingPage({ page, pageSize, status: params.status, listingType }),
        ListingService.getHydratableListingPage({ page: 1, pageSize: 1, listingType: "STANDARD" }),
        ListingService.getHydratableListingPage({ page: 1, pageSize: 1, listingType: "CURATED" }),
    ]);
    if (pageData.ids.length === 0) {
        return {
            listings: [], page, pageSize, total: pageData.total,
            counts: {
                ALL: Object.values(countData.statusCounts).reduce((sum, count) => sum + count, 0),
                PENDING: countData.statusCounts.PENDING || 0,
                VERIFIED: countData.statusCounts.VERIFIED || 0,
                REJECTED: countData.statusCounts.REJECTED || 0,
            },
            curatedTotal: curatedCountData.total,
        };
    }

    const listings = await prisma.listing.findMany({
        where: { id: { in: pageData.ids } },
        select: {
            id: true, slug: true, title: true, imageSrc: true, category: true, locationValue: true,
            price: true, status: true, createdAt: true, listingType: true, enquiryCount: true,
            inConversation: true, notifyEmailSentAt: true, notifyReminderAt: true,
            user: { select: { name: true, email: true, is_verified: true } },
        },
    });
    const position = new Map(pageData.ids.map((id, index) => [id, index]));
    const ordered = listings.sort((a, b) => (position.get(a.id) || 0) - (position.get(b.id) || 0));

    return {
        listings: ordered.map((listing) => ({
            id: listing.id,
            slug: listing.slug,
            title: listing.title,
            imageSrc: listing.imageSrc,
            category: listing.category,
            locationValue: listing.locationValue,
            price: listing.price,
            status: listing.status,
            createdAt: listing.createdAt.toISOString(),
            listingType: listing.listingType,
            enquiryCount: listing.enquiryCount,
            inConversation: listing.inConversation,
            notifyEmailSentAt: listing.notifyEmailSentAt?.toISOString() ?? null,
            notifyReminderAt: listing.notifyReminderAt?.toISOString() ?? null,
            user: listing.user ? {
                name: listing.user.name,
                email: listing.user.email,
                is_verified: listing.user.is_verified,
            } : null,
        })),
        page,
        pageSize,
        total: pageData.total,
        counts: {
            ALL: Object.values(countData.statusCounts).reduce((sum, count) => sum + count, 0),
            PENDING: countData.statusCounts.PENDING || 0,
            VERIFIED: countData.statusCounts.VERIFIED || 0,
            REJECTED: countData.statusCounts.REJECTED || 0,
        },
        curatedTotal: curatedCountData.total,
    };
}

export async function getAdminListingReviewDetail(listingId: string) {
    if (!/^[a-f\d]{24}$/i.test(listingId)) throw new Error("Invalid listing ID");
    const listings = await getAdminListingReviews(undefined, listingId);
    return listings[0] || null;
}

export async function getPendingListings() {
    return getAdminListingReviews("PENDING");
}

export async function getBlocksAction(listingId: string) {
    try {
        if (!/^[a-f\d]{24}$/i.test(listingId)) return [];
        const user = await getCurrentUser();
        if (!user) return [];
        const listing = await prisma.listing.findUnique({
            where: { id: listingId },
            select: { userId: true },
        });
        if (!listing || (listing.userId !== user.id && user.role !== "ADMIN")) return [];
        return await ListingService.getBlocks(listingId);
    } catch (error) {
        console.error("[getBlocksAction] Error:", error);
        throw new Error("Failed to load availability blocks");
    }
}

export async function getDayStatusAction(listingId: string, date: string) {
    try {
        if (!/^[a-f\d]{24}$/i.test(listingId) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
        const user = await getCurrentUser();
        if (!user) return null;
        const listing = await prisma.listing.findUnique({
            where: { id: listingId },
            select: { userId: true },
        });
        if (!listing || (listing.userId !== user.id && user.role !== "ADMIN")) return null;
        const parsedDate = new Date(`${date}T00:00:00.000Z`);
        if (!Number.isFinite(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) return null;

        const dayStatus = await prisma.dayStatus.findUnique({
            where: {
                listingId_date: { listingId, date: parsedDate }
            },
        });
        return dayStatus ? {
            ...dayStatus,
            date: dayStatus.date.toISOString(),
            createdAt: dayStatus.createdAt.toISOString(),
            updatedAt: dayStatus.updatedAt.toISOString(),
        } : null;
    } catch (error) {
        console.error("[getDayStatusAction] Error:", error);
        throw new Error("Failed to load day status");
    }
}

/**
 * Enterprise Mutations (Wrapped with createAction)
 */

export const createListingAction = createAction(
    listingSchema,
    { requireAuth: true, allowedRoles: ["CUSTOMER", "OWNER", "ADMIN"] },
    async (data, { user }) => {
        const isContcave = user.email?.toLowerCase().trim() === "contcave@gmail.com";
        if (!isContcave && user.role !== "OWNER" && user.role !== "ADMIN") {
            throw new UserFacingError("You must be an approved owner or administrator to create a listing", 403);
        }

        const enforcedData = {
            ...data,
            listingType: isContcave
                ? (data.listingType === "CURATED" ? ("CURATED" as const) : ("STANDARD" as const))
                : ("STANDARD" as const),
        };

        const listing = await ListingService.createListing(user.id, enforcedData, isContcave || user.role === "ADMIN");
        revalidatePath("/properties");
        revalidatePath("/dashboard/properties");
        return listing;
    }
);

const listingUpdateActionSchema = z.object({ id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid listing ID") }).passthrough().transform((input, ctx) => {
    const listingKeys = new Set(
        Object.keys(listingBaseSchema.shape).filter((key) => key !== "id" && key !== "agreementSignature")
    );
    const rawUpdateData = Object.entries(input).reduce<Record<string, unknown>>((acc, [key, value]) => {
        if (listingKeys.has(key)) acc[key] = value;
        return acc;
    }, {});

    const parsed = listingBaseSchema.partial().safeParse(rawUpdateData);
    if (!parsed.success) {
        for (const issue of parsed.error.issues) {
            ctx.addIssue({ code: "custom", message: issue.message, path: issue.path });
        }
        return z.NEVER;
    }

    const updateData = Object.keys(rawUpdateData).reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = (parsed.data as Record<string, unknown>)[key];
        return acc;
    }, {});

    return { id: input.id, ...updateData };
});

export const updateListingAction = createAction(
    listingUpdateActionSchema,
    { requireAuth: true, allowedRoles: ["OWNER", "ADMIN"] },
    async (data, { user }) => {
        const { id, ...updateData } = data;
        const listing = await ListingService.updateListing(user.id, id, updateData, user.role === "ADMIN");

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
        await ListingService.deleteListing(user.id, data.listingId, user.role === "ADMIN");
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
        await ListingService.createBlock(user.id, listingId, blockData, user.role === "ADMIN");
        revalidatePath(`/listings/${listingId}`);
        return { success: true };
    }
);

export const deleteBlockAction = createAction(
    deleteBlockSchema,
    { requireAuth: true, allowedRoles: ["OWNER", "ADMIN"] },
    async (data, { user }) => {
        await ListingService.deleteBlock(user.id, data.listingId, data.blockId, user.role === "ADMIN");
        revalidatePath(`/listings/${data.listingId}`);
        return { success: true };
    }
);

export const updateDayStatusAction = createAction(
    dayStatusSchema,
    { requireAuth: true, allowedRoles: ["OWNER", "ADMIN"] },
    async (data, { user }) => {
        const { listingId, date, listingActive, startTime, endTime } = data;
        const parsedDate = new Date(`${date}T00:00:00.000Z`);

        const listing = await prisma.listing.findUnique({
            where: { id: listingId },
            select: { userId: true },
        });

        if (!listing || (listing.userId !== user.id && user.role !== "ADMIN")) {
            throw new UserFacingError("Permission denied or listing not found", 403);
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

// â”€â”€â”€ Curated Listing Actions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const curatedHttpUrlSchema = (maxLength: number) => z.string().url().max(maxLength).refine((value) => {
    try {
        const protocol = new URL(value).protocol;
        return protocol === "http:" || protocol === "https:";
    } catch {
        return false;
    }
}, "URL must use HTTP or HTTPS");

const curatedListingSchema = z.object({
    title: z.string().min(2).max(200),
    description: z.string().min(10).max(5000),
    category: z.string().trim().min(1).max(100),
    locationValue: z.string().trim().min(1).max(300),
    propertyStateCode: z.string().regex(/^\d{2}$/).optional().nullable(),
    imageSrc: z.array(curatedHttpUrlSchema(500)).min(1).max(30),
    mapsUrl: curatedHttpUrlSchema(1000).optional().or(z.literal("")),
    websiteUrl: curatedHttpUrlSchema(1000).optional().or(z.literal("")),
    instagramHandle: z.string().trim().regex(/^@?[A-Za-z0-9._]{1,30}$/, "Invalid Instagram handle").optional(),
    priceRangeMin: z.number().int().positive().optional(),
    priceRangeMax: z.number().int().positive().optional(),
    contactEmail: z.string().email().optional().or(z.literal("")),
    curatedSource: z.string().trim().max(500).optional(),
}).refine((data) => data.priceRangeMin == null || data.priceRangeMax == null || data.priceRangeMin <= data.priceRangeMax, {
    message: "Minimum price cannot exceed maximum price",
    path: ["priceRangeMax"],
});

export const createCuratedListingAction = createAction(
    curatedListingSchema,
    { requireAuth: true, allowedRoles: ["ADMIN"] },
    async (data, { user }) => {
        const listing = await prisma.listing.create({
            data: {
                title: data.title,
                description: data.description,
                category: data.category,
                locationValue: data.locationValue,
                propertyStateCode: data.propertyStateCode || getGstStateCodeFromStateName(data.locationValue),
                imageSrc: data.imageSrc,
                mapsUrl: data.mapsUrl || null,
                websiteUrl: data.websiteUrl || null,
                instagramHandle: data.instagramHandle || null,
                priceRangeMin: data.priceRangeMin ?? null,
                priceRangeMax: data.priceRangeMax ?? null,
                contactEmail: data.contactEmail || null,
                curatedSource: data.curatedSource || null,
                listingType: "CURATED",
                status: "VERIFIED",
                active: true,
                userId: user.id,
                amenities: [],
                otherAmenities: [],
                type: [],
            },
        });

        if (data.contactEmail) {
            try {
                const { sendCuratedOutreachEmail } = await import("@/lib/email/templates");
                await sendCuratedOutreachEmail({
                    toEmail: data.contactEmail,
                    studioName: data.title,
                    city: data.locationValue,
                    listingId: listing.id,
                });
                await prisma.listing.update({
                    where: { id: listing.id },
                    data: { notifyEmailSentAt: new Date() },
                });
            } catch (err) {
                console.error("[createCuratedListing] Outreach email failed:", err);
            }
        }

        revalidatePath("/home");
        revalidatePath("/admin/dashboard/listings");
        return { listingId: listing.id };
    }
);

export const markInConversationAction = createAction(
    z.object({ listingId: objectIdSchema, inConversation: z.boolean() }),
    { requireAuth: true, allowedRoles: ["ADMIN"] },
    async ({ listingId, inConversation }) => {
        await prisma.listing.update({
            where: { id: listingId },
            data: { inConversation },
        });
        revalidatePath("/admin/dashboard/listings");
        return { ok: true };
    }
);

export async function trackEnquiryAction(listingId: string): Promise<void> {
    "use server";
    try {
        if (!/^[a-f\d]{24}$/i.test(listingId)) return;
        const requestLimit = rateLimitRequest(await headers(), {
            scope: `curated-enquiry:${listingId}`,
            limit: 10,
            windowMs: 60 * 60_000,
        });
        if (!requestLimit.allowed) return;
        await prisma.listing.updateMany({
            where: {
                id: listingId,
                listingType: "CURATED",
                status: "VERIFIED",
                active: true,
                OR: [{ archivedAt: null }, { archivedAt: { isSet: false } }],
            },
            data: { enquiryCount: { increment: 1 } },
        });
    } catch {
        // Non-critical â€” don't surface to user
    }
}
