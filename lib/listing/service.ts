import { AdditionalSetPricingType, Prisma } from "@prisma/client";

import prisma from "@/lib/prismadb";
import { isRichTextEmpty } from "@/lib/richText";
import { generateUniqueSlug } from "@/lib/slug";
import { slugify } from "@/lib/strings";
import { sanitizeStringList } from "@/lib/strings";
import { listingBaseSchema, listingSchema } from "@/schemas/listing";
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

type RawMongoId = string | { $oid?: unknown };
type RawListingId = { _id?: RawMongoId };

const JSON_FIELD_KEYS = new Set([
    "actualLocation",
    "addons",
    "operationalDays",
    "operationalHours",
    "verifications",
]);

function isFileLike(value: object): boolean {
    const candidate = value as {
        name?: unknown;
        size?: unknown;
        slice?: unknown;
        arrayBuffer?: unknown;
    };

    return (
        typeof candidate.name === "string" &&
        typeof candidate.size === "number" &&
        (typeof candidate.slice === "function" || typeof candidate.arrayBuffer === "function")
    );
}

function toJsonCompatible(value: unknown): unknown {
    if (value == null || typeof value === "string" || typeof value === "boolean") return value;
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    if (value instanceof Date) return value.toISOString();
    if (typeof value === "function" || typeof value === "symbol" || typeof value === "bigint" || typeof value === "undefined") {
        return undefined;
    }
    if (Array.isArray(value)) {
        return value.map((item) => {
            const next = toJsonCompatible(item);
            return typeof next === "undefined" ? null : next;
        });
    }
    if (typeof value === "object") {
        if (isFileLike(value)) return undefined;

        return Object.entries(value).reduce<Record<string, unknown>>((acc, [key, item]) => {
            const next = toJsonCompatible(item);
            if (typeof next !== "undefined") acc[key] = next;
            return acc;
        }, {});
    }

    return undefined;
}

function toNullableJson(value: unknown): Prisma.InputJsonValue | null {
    const next = toJsonCompatible(value);
    return typeof next === "undefined" ? null : next as Prisma.InputJsonValue;
}

function sanitizeListingJsonFields<T extends Record<string, unknown>>(data: T): T {
    const sanitized = { ...data };

    for (const key of JSON_FIELD_KEYS) {
        if (key in sanitized) {
            sanitized[key as keyof T] = toNullableJson(sanitized[key as keyof T]) as T[keyof T];
        }
    }

    return sanitized;
}

export class ListingService {
    private static readonly NUMERIC_OR_EMPTY_FILTER = [
        { $exists: false },
        null,
        { $type: "int" },
        { $type: "long" },
    ];

    private static getHydratableNumberFilter(fieldName: string) {
        return {
            $or: this.NUMERIC_OR_EMPTY_FILTER.map((condition) => ({
                [fieldName]: condition,
            })),
        };
    }

    private static getHydratableListingFilter(params: { active?: boolean; status?: string } = { active: true }): Record<string, unknown> {
        const filter: Record<string, unknown> = {
            $and: [
                this.getHydratableNumberFilter("price"),
                this.getHydratableNumberFilter("carpetArea"),
                this.getHydratableNumberFilter("minimumBookingHours"),
                this.getHydratableNumberFilter("maximumPax"),
                this.getHydratableNumberFilter("unifiedSetPrice"),
                this.getHydratableNumberFilter("priceRangeMin"),
                this.getHydratableNumberFilter("priceRangeMax"),
                this.getHydratableNumberFilter("enquiryCount"),
            ],
        };

        if (typeof params.active === "boolean") filter.active = params.active;
        if (params.status) filter.status = params.status;

        return filter;
    }

    private static extractRawMongoId(raw: RawListingId): string | null {
        const id = raw._id;
        if (typeof id === "string") return id;
        if (id && typeof id === "object" && typeof id.$oid === "string") return id.$oid;
        return null;
    }

    static async getHydratableListingIds(params: { active?: boolean; status?: string } = { active: true }): Promise<string[]> {
        const rawListings = await prisma.listing.findRaw({
            filter: this.getHydratableListingFilter(params) as Prisma.InputJsonObject,
            options: { projection: { _id: 1 } },
        }) as unknown as RawListingId[];

        return rawListings
            .map((item) => this.extractRawMongoId(item))
            .filter((id): id is string => !!id);
    }

    static async createListing(userId: string, body: Record<string, unknown>): Promise<FullListing> {
        const validated = listingSchema.parse(body);

        const {
            id,
            listingType,
            title, description, imageSrc, category, locationValue, actualLocation,
            price, amenities, otherAmenities, addons, carpetArea, operationalDays,
            operationalHours, minimumBookingHours, maximumPax, instantBooking, type,
            verifications, customTerms, packages,
            hasSets, setsHaveSamePrice, unifiedSetPrice, additionalSetPricingType, sets,
            terms, slug,
            priceRangeMin, priceRangeMax, mapsUrl, websiteUrl, instagramHandle, contactEmail,
        } = validated;

        const trimmedTitle = title.trim();
        const trimmedDescription = description.trim();

        // 2. Normalization
        const priceValue = Math.round(Number(price) || 0);
        const privacySafeLatLng = jitterLatLng((actualLocation as { latlng?: unknown })?.latlng);
        const finalActualLocation = { ...(actualLocation as Record<string, unknown>), latlng: privacySafeLatLng || [0, 0] };
        const newSlug = await generateUniqueSlug(slug || trimmedTitle);
        const finalAddons = toNullableJson(addons);
        const finalOperationalDays = toNullableJson(operationalDays);
        const finalOperationalHours = toNullableJson(operationalHours);
        const finalVerifications = toNullableJson(verifications);

        // 3. Atomic Transaction
        return await prisma.$transaction(async (tx) => {
            const listing = await tx.listing.create({
                data: {
                    ...(id ? { id } : {}),
                    slug: newSlug,
                    title: trimmedTitle,
                    description: trimmedDescription,
                    imageSrc: Array.isArray(imageSrc) ? imageSrc.map((img: unknown) => String(img).trim()) : [],
                    category: String(category || "").trim(),
                    locationValue: String(locationValue || "").trim(),
                    actualLocation: toNullableJson(finalActualLocation),
                    price: priceValue,
                    user: { connect: { id: userId } },
                    amenities: sanitizeStringList(amenities),
                    otherAmenities: sanitizeStringList(otherAmenities),
                    addons: finalAddons,
                    carpetArea: carpetArea,
                    operationalDays: finalOperationalDays,
                    operationalHours: finalOperationalHours,
                    minimumBookingHours: minimumBookingHours,
                    maximumPax: maximumPax,
                    instantBooking: Boolean(instantBooking),
                    type: Array.isArray(type) ? type.map(t => String(t)) : [],
                    verifications: finalVerifications,
                    terms: Boolean(terms),
                    listingType: (listingType as "STANDARD" | "CURATED") ?? "STANDARD",
                    priceRangeMin: priceRangeMin ?? null,
                    priceRangeMax: priceRangeMax ?? null,
                    mapsUrl: mapsUrl || null,
                    websiteUrl: websiteUrl || null,
                    instagramHandle: instagramHandle || null,
                    contactEmail: contactEmail || null,
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
                        ...(set.id ? { id: set.id } : {}),
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
                include: { packages: true, sets: { orderBy: [{ price: "asc" }, { position: "asc" }] }, user: true },
            }) as unknown as FullListing;
        });
    }

    static async updateListing(userId: string, listingId: string, body: Record<string, unknown>): Promise<FullListing> {
        const validated = listingBaseSchema.partial().parse(body);
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
        if (listingData.slug) listingData.slug = slugify(listingData.slug);

        // 3. Normalized Location (Privacy Jitter)
        const loc = listingData.actualLocation;
        if (loc) {
            const privacySafeLatLng = jitterLatLng(loc.latlng);
            listingData.actualLocation = {
                ...loc,
                latlng: privacySafeLatLng || [0, 0]
            } as typeof loc;
        }
        const sanitizedListingData = sanitizeListingJsonFields(listingData as Record<string, unknown>);

        // 4. Atomic Transaction
        return await prisma.$transaction(async (tx) => {
            // Update Main Listing
            if (Object.keys(sanitizedListingData).length > 0) {
                await tx.listing.update({
                    where: { id: listingId },
                    data: {
                        ...sanitizedListingData,
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
                include: { packages: true, sets: { orderBy: [{ price: "asc" }, { position: "asc" }] }, user: true },
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
    static async updateStatus(
        listingId: string,
        status: "VERIFIED" | "REJECTED" | "PENDING",
        active: boolean,
        review?: { reviewedById?: string; rejectionReason?: string | null }
    ): Promise<void> {
        await prisma.listing.update({
            where: { id: listingId },
            data: {
                status,
                active,
                reviewedAt: new Date(),
                reviewedById: review?.reviewedById,
                rejectionReason: review?.rejectionReason ?? null,
            }
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
            const hydratableIds = await this.getHydratableListingIds({ active: true });
            if (hydratableIds.length === 0) return [];
            query.id = { in: hydratableIds };
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
            include: { packages: true, sets: { orderBy: [{ price: "asc" }, { position: "asc" }] }, user: true },
        });

        const normalized = listings
            .map(l => this.normalizeListingWithRelations(l as ListingWithRelations))
            .filter((item): item is FullListing => item !== null);

        const weighted = normalized.map((item) => {
            const isVerifiedStandard = item.status === "VERIFIED" && item.listingType === "STANDARD";
            const isCurated = item.listingType === "CURATED";
            return {
                item,
                weight: isVerifiedStandard ? 1 : isCurated ? 2 : 3,
                time: item.createdAt ? new Date(item.createdAt).getTime() : 0,
            };
        });

        weighted.sort((a, b) => {
            if (a.weight !== b.weight) {
                return a.weight - b.weight;
            }
            return b.time - a.time;
        });

        return weighted.map((w) => w.item);
    }

    static async getRandomListings(limit: number = 3): Promise<FullListing[]> {
        const hydratableIds = await this.getHydratableListingIds({ active: true });
        const count = hydratableIds.length;

        if (count === 0) return [];

        if (count <= limit) {
            const listings = await prisma.listing.findMany({
                where: { id: { in: hydratableIds } },
                include: { packages: true, sets: { orderBy: [{ price: "asc" }, { position: "asc" }] }, user: true },
            });
            return listings
                .sort(() => Math.random() - 0.5)
                .map(l => this.normalizeListingWithRelations(l as ListingWithRelations))
                .filter((item): item is FullListing => item !== null);
        }

        const shuffledIds = hydratableIds
            .sort(() => Math.random() - 0.5)
            .slice(0, limit);

        const listings = await prisma.listing.findMany({
            where: { id: { in: shuffledIds } },
            include: { packages: true, sets: { orderBy: [{ price: "asc" }, { position: "asc" }] }, user: true },
        });

        return shuffledIds
            .map(id => listings.find(l => l.id === id))
            .filter((l): l is NonNullable<typeof l> => !!l)
            .map(l => this.normalizeListingWithRelations(l as ListingWithRelations))
            .filter((item): item is FullListing => item !== null);
    }

    static async findById(listingId: string): Promise<FullListing | null> {
        const isObjectId = /^[0-9a-fA-F]{24}$/.test(listingId);

        const listing = isObjectId
            ? await prisma.listing.findFirst({
                where: { id: listingId },
                include: { user: true, packages: true, sets: { orderBy: [{ price: "asc" }, { position: "asc" }] }, blocks: true }
            })
            : await prisma.listing.findFirst({
                where: { slug: listingId },
                include: { user: true, packages: true, sets: { orderBy: [{ price: "asc" }, { position: "asc" }] }, blocks: true }
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
