import { AdditionalSetPricingType, Prisma } from "@prisma/client";

import prisma from "@/lib/prismadb";
import { isRichTextEmpty } from "@/lib/richText";
import { generateUniqueSlug } from "@/lib/slug";
import { sanitizeStringList } from "@/lib/strings/sanitizeStringList";
import { listingSchema } from "@/schemas/listing";
import { Addon } from "@/types/addon";
import { ActualLocation, FullListing, ListingBlockData } from "@/types/listing";

import { jitterLatLng } from "./utils";

type ListingWithRelations = Prisma.ListingGetPayload<{
    include: {
        user: true;
        packages: true;
        sets: true;
        blocks: true;
    };
}>;

export class ListingService {
    static async createListing(userId: string, body: Record<string, unknown>): Promise<FullListing> {
        const validated = listingSchema.parse(body);

        const {
            title, description, imageSrc, category, locationValue, actualLocation,
            price, amenities, otherAmenities, addons, carpetArea, operationalDays,
            operationalHours, minimumBookingHours, maximumPax, instantBooking, type,
            verifications, customTerms, packages,
            hasSets, setsHaveSamePrice, unifiedSetPrice, additionalSetPricingType, sets,
            terms
        } = validated;

        const trimmedTitle = title.trim();
        const trimmedDescription = description.trim();

        // 2. Normalization
        const priceValue = Math.round(Number(price) || 0);
        const privacySafeLatLng = jitterLatLng((actualLocation as { latlng?: unknown })?.latlng);
        const finalActualLocation = { ...(actualLocation as Record<string, unknown>), latlng: privacySafeLatLng || [0, 0] };
        const newSlug = await generateUniqueSlug(trimmedTitle);

        // 3. Atomic Transaction
        return await prisma.$transaction(async (tx) => {
            const listing = await tx.listing.create({
                data: {
                    slug: newSlug,
                    title: trimmedTitle,
                    description: trimmedDescription,
                    imageSrc: Array.isArray(imageSrc) ? imageSrc.map((img: unknown) => String(img).trim()) : [],
                    category: String(category || "").trim(),
                    locationValue: String(locationValue || "").trim(),
                    actualLocation: finalActualLocation as Prisma.InputJsonValue,
                    price: priceValue,
                    user: { connect: { id: userId } },
                    amenities: sanitizeStringList(amenities),
                    otherAmenities: sanitizeStringList(otherAmenities),
                    addons: (addons as Prisma.InputJsonValue) || null,
                    carpetArea: carpetArea,
                    operationalDays: (operationalDays as Prisma.InputJsonValue) || null,
                    operationalHours: (operationalHours as Prisma.InputJsonValue) || null,
                    minimumBookingHours: minimumBookingHours,
                    maximumPax: maximumPax,
                    instantBooking: Boolean(instantBooking),
                    type: Array.isArray(type) ? type.map(t => String(t)) : [],
                    verifications: (verifications as Prisma.InputJsonValue) || null,
                    terms: Boolean(terms),
                    status: "PENDING",
                    active: false,
                    hasSets: Boolean(hasSets),
                    setsHaveSamePrice: Boolean(setsHaveSamePrice),
                    unifiedSetPrice: setsHaveSamePrice ? Math.round(Number(unifiedSetPrice)) : null,
                    additionalSetPricingType: additionalSetPricingType as AdditionalSetPricingType || null,
                    customTerms: isRichTextEmpty(customTerms as string) ? null : String(customTerms).trim(),
                    videoSrc: (body.videoSrc as string) || null,
                },
            });

            // Handle Sets
            if (hasSets && Array.isArray(sets) && sets.length > 0) {
                const setData = sets.map((s: unknown, index: number) => {
                    const set = s as { name?: string; description?: string; images?: string[]; price?: number; position?: number; id?: string };
                    return {
                        name: String(set.name || "").trim(),
                        description: set.description ? String(set.description).trim().slice(0, 2000) : null,
                        images: Array.isArray(set.images) ? set.images.filter((img: unknown) => typeof img === "string" && !img.startsWith("blob:")) : [],
                        price: Math.round(Number(set.price) || 0),
                        position: typeof set.position === "number" ? Math.round(set.position) : index,
                        listingId: listing.id,
                    };
                });
                await tx.listingSet.createMany({ data: setData });
            }

            // Handle Packages
            if (Array.isArray(packages) && packages.length > 0) {
                const createdSets = await tx.listingSet.findMany({
                    where: { listingId: listing.id },
                    select: { id: true, position: true }
                });

                const packageData = packages.map((pkg: unknown) => {
                    const p = pkg as { title?: string; description?: string; originalPrice?: number; offeredPrice?: number; features?: string[]; durationHours?: number; requiredSetCount?: number; fixedAddOn?: number; eligibleSetIds?: string[]; isActive?: boolean; id?: string };
                    let eligibleSetIds: string[] = [];
                    if (Array.isArray(p.eligibleSetIds)) {
                        eligibleSetIds = p.eligibleSetIds.map((id: unknown) => {
                            const sId = String(id);
                            if (sId.startsWith("temp-")) {
                                const idx = parseInt(sId.replace("temp-", ""), 10);
                                return createdSets[idx]?.id;
                            }
                            return createdSets.find(s => s.id === sId)?.id;
                        }).filter((id: string | undefined): id is string => !!id);
                    }

                    return {
                        title: String(p.title || "").trim(),
                        description: p.description ? String(p.description).trim().slice(0, 500) : null,
                        originalPrice: Math.round(Number(p.originalPrice) || 0),
                        offeredPrice: Math.round(Number(p.offeredPrice) || 0),
                        features: Array.isArray(p.features) ? p.features.map((f: unknown) => String(f).trim()) : [],
                        durationHours: Math.round(Number(p.durationHours) || 0),
                        requiredSetCount: p.requiredSetCount ? Math.max(1, Number(p.requiredSetCount) || 1) : null,
                        fixedAddOn: p.fixedAddOn != null ? Math.max(0, Number(p.fixedAddOn)) : null,
                        eligibleSetIds,
                        isActive: p.isActive !== false,
                        listingId: listing.id,
                    };
                });
                await tx.package.createMany({ data: packageData });
            }

            return await tx.listing.findUnique({
                where: { id: listing.id },
                include: { packages: true, sets: { orderBy: { position: "asc" } }, user: true },
            }) as unknown as FullListing;
        });
    }

    static async updateListing(userId: string, listingId: string, body: Record<string, unknown>): Promise<FullListing> {
        const validated = listingSchema.partial().parse(body);
        const { packages, sets, ...listingData } = validated;

        // 1. Permission Check
        const existingListing = await prisma.listing.findUnique({
            where: { id: listingId },
            select: { userId: true },
        });
        if (!existingListing || existingListing.userId !== userId) throw new Error("Permission denied");

        // 2. Normalization
        if (listingData.description && isRichTextEmpty(listingData.description as string)) throw new Error("Description cannot be empty");

        if (listingData.unifiedSetPrice != null) listingData.unifiedSetPrice = Math.round(Number(listingData.unifiedSetPrice));
        if (listingData.price != null) listingData.price = Math.round(Number(listingData.price));

        // 3. Normalized Location (Privacy Jitter)
        const loc = listingData.actualLocation;
        if (loc) {
            const privacySafeLatLng = jitterLatLng(loc.latlng);
            listingData.actualLocation = {
                ...loc,
                latlng: privacySafeLatLng || [0, 0]
            } as typeof loc;
        }

        // 4. Atomic Transaction
        return await prisma.$transaction(async (tx) => {
            // Update Main Listing
            if (Object.keys(listingData).length > 0) {
                await tx.listing.update({
                    where: { id: listingId },
                    data: {
                        ...listingData,
                        videoSrc: body.videoSrc !== undefined ? (body.videoSrc as string | null) : undefined,
                    } as Prisma.ListingUpdateInput,
                });
            }

            // Sync Packages
            if (Array.isArray(packages)) {
                const existing = await tx.package.findMany({ where: { listingId }, select: { id: true } });
                const incomingIds = new Set(packages.map((pkg: unknown) => (pkg as { id?: string }).id).filter(Boolean));
                const toDelete = existing.filter(p => !incomingIds.has(p.id)).map(p => p.id);
                if (toDelete.length > 0) await tx.package.deleteMany({ where: { id: { in: toDelete } } });

                for (const pkg of packages) {
                    const p = pkg as { title?: string; originalPrice?: number; offeredPrice?: number; features?: string[]; durationHours?: number; requiredSetCount?: number; id?: string };
                    const pData = {
                        title: String(p.title || "").trim(),
                        originalPrice: Math.round(Number(p.originalPrice) || 0),
                        offeredPrice: Math.round(Number(p.offeredPrice) || 0),
                        features: Array.isArray(p.features) ? p.features.map((f: unknown) => String(f)) : [],
                        durationHours: Math.round(Number(p.durationHours) || 0),
                        requiredSetCount: p.requiredSetCount ? Number(p.requiredSetCount) : null,
                        listingId,
                    };
                    if (p.id) await tx.package.update({ where: { id: p.id }, data: pData });
                    else await tx.package.create({ data: pData });
                }
            }

            // Sync Sets
            if (Array.isArray(sets)) {
                const existing = await tx.listingSet.findMany({ where: { listingId }, select: { id: true } });
                const incomingIds = new Set(sets.map((s: unknown) => (s as { id?: string }).id).filter(Boolean));
                const toDelete = existing.filter(s => !incomingIds.has(s.id)).map(s => s.id);

                if (toDelete.length > 0) {
                    const futureRes = await tx.reservation.findFirst({
                        where: { listingId, setIds: { hasSome: toDelete }, startDate: { gte: new Date() }, markedForDeletion: false }
                    });
                    if (futureRes) throw new Error("Cannot delete sets with future reservations");
                    await tx.listingSet.deleteMany({ where: { id: { in: toDelete } } });
                }

                for (let i = 0; i < sets.length; i++) {
                    const setData = sets[i] as { name?: string; description?: string; images?: string[]; price?: number; position?: number; id?: string };
                    const sData = {
                        name: String(setData.name || "").trim(),
                        description: setData.description || null,
                        images: Array.isArray(setData.images) ? setData.images.filter((img: unknown) => typeof img === "string" && !img.startsWith("blob:")) : [],
                        price: Math.round(Number(setData.price) || 0),
                        position: typeof setData.position === "number" ? setData.position : i,
                        listingId,
                    };
                    if (setData.id) await tx.listingSet.update({ where: { id: setData.id }, data: sData });
                    else await tx.listingSet.create({ data: sData });
                }
            }

            return await tx.listing.findUnique({
                where: { id: listingId },
                include: { packages: true, sets: { orderBy: { position: "asc" } }, user: true },
            }) as unknown as FullListing;
        });
    }

    /**
     * User-initiated Listing Deletion
     */
    static async deleteListing(userId: string, listingId: string): Promise<void> {
        const listing = await prisma.listing.findUnique({
            where: { id: listingId },
            select: { userId: true },
        });
        if (!listing || listing.userId !== userId) throw new Error("Permission denied");
        await prisma.listing.delete({ where: { id: listingId } });
    }

    /**
     * Administrative Listing Deletion
     */
    static async deleteAdmin(listingId: string): Promise<void> {
        await prisma.listing.delete({ where: { id: listingId } });
    }

    /**
     * Administrative Status Update (Approve/Reject)
     */
    static async updateStatus(listingId: string, status: "VERIFIED" | "REJECTED" | "PENDING", active: boolean): Promise<void> {
        await prisma.listing.update({
            where: { id: listingId },
            data: { status, active }
        });
    }

    /**
     * Calendar Blocking Logic
     */
    static async getBlocks(listingId: string) {
        return await prisma.listingBlock.findMany({
            where: { listingId },
            orderBy: [{ date: "asc" }, { startTime: "asc" }],
        });
    }


    static async createBlock(userId: string, listingId: string, data: ListingBlockData) {
        const listing = await prisma.listing.findUnique({
            where: { id: listingId },
            select: { userId: true },
        });
        if (!listing) throw new Error("Listing not found");
        if (listing.userId !== userId) throw new Error("Permission denied");

        const { date, startTime, endTime, setIds, reason } = data;
        return await prisma.listingBlock.create({
            data: {
                listingId,
                date: new Date(date as string),
                startTime: String(startTime).trim(),
                endTime: String(endTime).trim(),
                setIds: Array.isArray(setIds) ? setIds.map(String) : [],
                reason: typeof reason === "string" ? reason.trim().slice(0, 500) : null,
            },
        });
    }

    /**
     * Data Retrieval: Fetches a list of listings based on filters.
     */
    static async getListings(params: {
        userId?: string;
        locationValue?: string;
        category?: string;
        type?: string;
        hasSets?: boolean;
        startDate?: string;
        endDate?: string;
    }): Promise<FullListing[]> {
        const { userId, locationValue, category, type, hasSets, startDate, endDate } = params;

        const query: Prisma.ListingWhereInput = {};

        if (userId) {
            query.userId = userId;
        } else {
            query.active = true;
        }

        if (category) query.category = category;
        if (locationValue) query.locationValue = locationValue;
        if (type) query.type = { has: type };
        if (hasSets) query.hasSets = true;

        if (startDate && endDate) {
            query.NOT = {
                reservations: {
                    some: {
                        AND: [
                            { markedForDeletion: false },
                            {
                                startDate: {
                                    gte: new Date(startDate),
                                    lte: new Date(endDate),
                                },
                            },
                        ],
                    },
                },
            };
        }

        const listings = await prisma.listing.findMany({
            where: query,
            orderBy: { createdAt: "desc" },
            include: { packages: true, sets: { orderBy: { position: "asc" } }, user: true },
        });

        return listings.map(l => this.normalizeListingWithRelations(l as ListingWithRelations));
    }

    /**
     * Data Retrieval: Fetches a single listing by ID or Slug.
     */
    static async findById(listingId: string): Promise<FullListing | null> {
        const isObjectId = /^[0-9a-fA-F]{24}$/.test(listingId);

        const listing = isObjectId
            ? await prisma.listing.findFirst({
                where: { id: listingId },
                include: { user: true, packages: true, sets: { orderBy: { position: "asc" } }, blocks: true }
            })
            : await prisma.listing.findFirst({
                where: { slug: listingId },
                include: { user: true, packages: true, sets: { orderBy: { position: "asc" } }, blocks: true }
            });

        if (!listing) return null;
        return this.normalizeListingWithRelations(listing as ListingWithRelations);
    }

    private static normalizeListingWithRelations(l: ListingWithRelations): FullListing {
        const castJson = <T>(value: unknown, fallback: T): T => {
            if (value === null || value === undefined) return fallback;
            return value as T;
        };

        const legacyTypeMap: Record<string, string> = {
            "Fashion shoot": "Fashion Shoot",
            "Photo Shoot": "Portraits & Photoshoot",
            "Pre-Wedding": "Pre-Wedding Shoot",
            "Product Shoot": "Product & E-commerce Shoot",
            "Video Shoot": "Video Production",
            "Film Shoot": "Film & Music Video Shoot",
            "Social Media Content": "Reels & Social Media Content",
            "Workshop": "Workshops & Classes",
            "Meeting": "Meetings & Creative Sessions",
            "Event": "Events & Pop-Ups",
            "Podcast": "Podcast Recording",
            "Interview": "Interviews & YouTube Videos",
        };

        const normalizedTypes = Array.from(new Set(((l.type as string[]) || []).map(t => legacyTypeMap[t] || t)));
        if (!l.user) {
            console.error(`[ListingService] Data integrity violation: Listing ${l.id} missing owner.`);
            return null as unknown as FullListing;
        }

        return {
            ...l,
            createdAt: l.createdAt.toISOString(),
            amenities: (l.amenities as string[]) || [],
            otherAmenities: (l.otherAmenities as string[]) || [],
            type: normalizedTypes,
            addons: castJson<Addon[]>(l.addons, []),
            packages: l.packages?.map(pkg => ({ ...pkg, createdAt: pkg.createdAt.toISOString() })) || [],
            operationalDays: castJson<{ start?: string; end?: string } | undefined>(l.operationalDays, undefined),
            operationalHours: castJson<{ start?: string; end?: string } | undefined>(l.operationalHours, undefined),
            actualLocation: castJson<ActualLocation | null>(l.actualLocation, null),
            sets: l.sets?.map(set => ({
                ...set,
                createdAt: set.createdAt.toISOString(),
                updatedAt: set.updatedAt.toISOString(),
            })) || [],
            blocks: l.blocks?.map(block => ({
                ...block,
                date: block.date.toISOString(),
                createdAt: block.createdAt.toISOString(),
            })) || [],
            carpetArea: l.carpetArea,
            maximumPax: l.maximumPax,
            minimumBookingHours: l.minimumBookingHours,
            avgReviewRating: l.avgReviewRating ?? undefined,
            instantBooking: l.instantBooking ?? undefined,
            videoSrc: l.videoSrc,
            user: {
                ...l.user,
                createdAt: l.user.createdAt.toISOString(),
                updatedAt: l.user.updatedAt.toISOString(),
                emailVerified: l.user.emailVerified?.toISOString() || null,
                verified_at: l.user.verified_at ? l.user.verified_at.toISOString() : null,
                markedForDeletionAt: l.user.markedForDeletionAt ? l.user.markedForDeletionAt.toISOString() : null,
                role: l.user.role,
            },
        };
    }

    static async deleteBlock(userId: string, listingId: string, blockId: string) {
        const block = await prisma.listingBlock.findUnique({
            where: { id: blockId },
            include: { listing: { select: { userId: true } } },
        });
        if (!block) throw new Error("Block not found");
        if (block.listing.userId !== userId) throw new Error("Permission denied");
        if (block.listingId !== listingId) throw new Error("Invalid request");

        await prisma.listingBlock.delete({ where: { id: blockId } });
    }
}
