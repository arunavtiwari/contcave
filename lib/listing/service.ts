import { AdditionalSetPricingType, Prisma } from "@prisma/client";
import { formatInTimeZone } from "date-fns-tz";

import { getGstStateCodeFromStateName } from "@/constants/gstStateCodes";
import { UserFacingError } from "@/lib/errors";
import prisma from "@/lib/prismadb";
import { parseReservationEndTimeForDate } from "@/lib/reservation/time";
import { isRichTextEmpty } from "@/lib/richText";
import { generateUniqueSlug } from "@/lib/slug";
import { slugify } from "@/lib/strings";
import { sanitizeStringList } from "@/lib/strings";
import { normaliseUseCase } from "@/lib/taxonomy";
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

const LISTING_UPDATE_KEYS = new Set(
    Object.keys(listingBaseSchema.shape).filter((key) => key !== "id" && key !== "agreementSignature")
);

function parseListingUpdateBody(body: Record<string, unknown>): Record<string, unknown> {
    const rawUpdateData = Object.entries(body).reduce<Record<string, unknown>>((acc, [key, value]) => {
        if (LISTING_UPDATE_KEYS.has(key)) acc[key] = value;
        return acc;
    }, {});

    const result = listingBaseSchema.partial().safeParse(rawUpdateData);
    if (!result.success) throw new UserFacingError(result.error.issues[0]?.message || "Invalid listing data");
    const parsed = result.data as Record<string, unknown>;

    return Object.keys(rawUpdateData).reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = parsed[key];
        return acc;
    }, {});
}

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

function isJsonEqual(a: unknown, b: unknown): boolean {
    return JSON.stringify(toJsonCompatible(a)) === JSON.stringify(toJsonCompatible(b));
}

interface PackageCompare {
    title: string;
    description: string | null;
    originalPrice: number;
    offeredPrice: number;
    features: string[];
    durationHours: number;
    requiredSetCount: number | null;
    fixedAddOn: number | null;
    eligibleSetIds: string[];
    isActive: boolean;
}

interface SetCompare {
    name: string;
    description: string | null;
    images: string[];
    price: number;
    position: number;
    aesthetics: string[];
    setFeatures: string[];
}

function isPackageEqual(a: PackageCompare, b: PackageCompare): boolean {
    return (
        a.title === b.title &&
        a.originalPrice === b.originalPrice &&
        a.offeredPrice === b.offeredPrice &&
        a.durationHours === b.durationHours &&
        a.requiredSetCount === b.requiredSetCount &&
        a.description === b.description &&
        a.fixedAddOn === b.fixedAddOn &&
        a.isActive === b.isActive &&
        JSON.stringify(a.features) === JSON.stringify(b.features) &&
        JSON.stringify(a.eligibleSetIds) === JSON.stringify(b.eligibleSetIds)
    );
}

function isSetEqual(a: SetCompare, b: SetCompare): boolean {
    return (
        a.name === b.name &&
        a.description === b.description &&
        a.price === b.price &&
        a.position === b.position &&
        JSON.stringify(a.images) === JSON.stringify(b.images) &&
        JSON.stringify(a.aesthetics) === JSON.stringify(b.aesthetics) &&
        JSON.stringify(a.setFeatures) === JSON.stringify(b.setFeatures)
    );
}

function shuffleCopy<T>(items: readonly T[]): T[] {
    const shuffled = [...items];
    for (let index = shuffled.length - 1; index > 0; index--) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }
    return shuffled;
}

function sanitizePublicLocation(value: unknown): ActualLocation | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const location = value as Record<string, unknown>;
    const latlng = Array.isArray(location.latlng) && location.latlng.length === 2
        ? location.latlng.map(Number)
        : null;
    if (!latlng || !latlng.every(Number.isFinite)) return null;

    const publicText = (key: string) => {
        const field = location[key];
        return typeof field === "string" && field.trim() ? field.trim() : undefined;
    };
    return {
        latlng: [latlng[0], latlng[1]],
        label: publicText("label"),
        region: publicText("region"),
        value: publicText("value"),
        country: publicText("country"),
        state: publicText("state"),
    };
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

    private static getHydratableListingFilter(params: { active?: boolean; status?: string; listingType?: "STANDARD" | "CURATED" } = { active: true }): Record<string, unknown> {
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
        if (params.listingType === "CURATED") filter.listingType = "CURATED";
        if (params.listingType === "STANDARD") {
            filter.listingType = { $ne: "CURATED" };
        }

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

    static async getHydratableListingPage(params: {
        page: number;
        pageSize: number;
        status?: string;
        listingType: "STANDARD" | "CURATED";
    }): Promise<{
        ids: string[];
        total: number;
        statusCounts: Record<string, number>;
    }> {
        const page = Number.isFinite(params.page)
            ? Math.max(1, Math.floor(params.page))
            : 1;
        const pageSize = Number.isFinite(params.pageSize)
            ? Math.min(100, Math.max(1, Math.floor(params.pageSize)))
            : 20;
        const filter = this.getHydratableListingFilter({
            ...(params.status ? { status: params.status } : {}),
            listingType: params.listingType,
        });
        const result = await prisma.listing.aggregateRaw({
            pipeline: [
                { $match: filter },
                {
                    $facet: {
                        rows: [
                            { $sort: { createdAt: -1 } },
                            { $skip: (page - 1) * pageSize },
                            { $limit: pageSize },
                            { $project: { _id: 1 } },
                        ],
                        counts: [
                            { $group: { _id: "$status", total: { $sum: 1 } } },
                        ],
                    },
                },
            ] as unknown as Prisma.InputJsonValue[],
        }) as unknown as Array<{
            rows?: RawListingId[];
            counts?: Array<{ _id?: string; total?: number }>;
        }>;
        const facet = result[0] || {};
        const statusCounts = (facet.counts || []).reduce<Record<string, number>>((acc, item) => {
            if (typeof item._id === "string" && typeof item.total === "number") acc[item._id] = item.total;
            return acc;
        }, {});
        const total = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);

        return {
            ids: (facet.rows || [])
                .map((item) => this.extractRawMongoId(item))
                .filter((id): id is string => !!id),
            total,
            statusCounts,
        };
    }

    static async createListing(userId: string, body: Record<string, unknown>, allowCurated = false): Promise<FullListing> {
        const result = listingSchema.safeParse(body);
        if (!result.success) throw new UserFacingError(result.error.issues[0]?.message || "Invalid listing data");
        const validated = result.data;

        const {
            id,
            listingType,
            title, description, imageSrc, category, locationValue, actualLocation, propertyStateCode,
            price, amenities, otherAmenities, addons, carpetArea, operationalDays,
            operationalHours, minimumBookingHours, maximumPax, instantBooking, type,
            venueTypes, aesthetics, setFeatures,
            verifications, customTerms, packages,
            hasSets, setsHaveSamePrice, unifiedSetPrice, additionalSetPricingType, sets,
            terms, slug,
            priceRangeMin, priceRangeMax, mapsUrl, websiteUrl, instagramHandle, contactEmail,
            videoSrc,
        } = validated;

        if (listingType === "CURATED" && !allowCurated) {
            throw new UserFacingError("Only administrators can create curated listings");
        }

        const trimmedTitle = title.trim();
        const trimmedDescription = description.trim();

        // 2. Normalization
        const priceValue = Math.round(Number(price) || 0);
        const privacySafeLatLng = jitterLatLng((actualLocation as { latlng?: unknown } | null)?.latlng);
        const finalActualLocation = actualLocation
            ? { ...(actualLocation as Record<string, unknown>), latlng: privacySafeLatLng }
            : null;
        const finalPropertyStateCode =
            propertyStateCode ||
            (actualLocation as { propertyStateCode?: string } | null)?.propertyStateCode ||
            getGstStateCodeFromStateName((actualLocation as { state?: string } | null)?.state);
        const newSlug = await generateUniqueSlug(slug || trimmedTitle);
        const finalAddons = toNullableJson(addons);
        const finalOperationalDays = toNullableJson(operationalDays);
        const finalOperationalHours = toNullableJson(operationalHours);
        const finalVerifications = toNullableJson(verifications);

        // 3. Atomic Transaction
        const createdListing = await prisma.$transaction(async (tx) => {
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
                    propertyStateCode: finalPropertyStateCode,
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
                    venueTypes: Array.isArray(venueTypes) ? venueTypes.map(v => String(v)) : [],
                    aesthetics: Array.isArray(aesthetics) ? aesthetics.map(a => String(a)) : [],
                    setFeatures: Array.isArray(setFeatures) ? setFeatures.map(f => String(f)) : [],
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
                    videoSrc: videoSrc || null,
                },
            });

            // Handle Sets
            if (hasSets && Array.isArray(sets) && sets.length > 0) {
                const setData = sets.map((s: unknown, index: number) => {
                    const set = s as { name?: string; description?: string; images?: string[]; price?: number; position?: number; id?: string; aesthetics?: string[]; setFeatures?: string[] };
                    return {
                        ...(set.id ? { id: set.id } : {}),
                        name: String(set.name || "").trim(),
                        description: set.description ? String(set.description).trim().slice(0, 2000) : null,
                        images: Array.isArray(set.images) ? set.images.filter((img: unknown) => typeof img === "string" && !img.startsWith("blob:")) : [],
                        price: Math.round(Number(set.price) || 0),
                        position: typeof set.position === "number" ? Math.round(set.position) : index,
                        aesthetics: Array.isArray(set.aesthetics) ? set.aesthetics.map(String) : [],
                        setFeatures: Array.isArray(set.setFeatures) ? set.setFeatures.map(String) : [],
                        listingId: listing.id,
                    };
                });
                await tx.listingSet.createMany({ data: setData });
            }

            // Handle Packages
            if (Array.isArray(packages) && packages.length > 0) {
                const createdSets = await tx.listingSet.findMany({
                    where: { listingId: listing.id },
                    select: { id: true },
                });
                const createdSetIds = new Set(createdSets.map((set) => set.id));

                const packageData = packages.map((pkg: unknown) => {
                    const p = pkg as { title?: string; description?: string; originalPrice?: number; offeredPrice?: number; features?: string[]; durationHours?: number; requiredSetCount?: number; fixedAddOn?: number; eligibleSetIds?: string[]; isActive?: boolean; id?: string };
                    const eligibleSetIds = hasSets && Array.isArray(p.eligibleSetIds)
                        ? p.eligibleSetIds.map(String)
                        : [];
                    if (eligibleSetIds.some((setId) => !createdSetIds.has(setId))) {
                        throw new UserFacingError("A package references a set outside this listing");
                    }

                    return {
                        title: String(p.title || "").trim(),
                        description: p.description ? String(p.description).trim().slice(0, 500) : null,
                        originalPrice: Math.round(Number(p.originalPrice) || 0),
                        offeredPrice: Math.round(Number(p.offeredPrice) || 0),
                        features: Array.isArray(p.features) ? p.features.map((f: unknown) => String(f).trim()) : [],
                        durationHours: Math.round(Number(p.durationHours) || 0),
                        requiredSetCount: hasSets && p.requiredSetCount ? Math.max(1, Number(p.requiredSetCount) || 1) : null,
                        fixedAddOn: p.fixedAddOn != null ? Math.max(0, Number(p.fixedAddOn)) : null,
                        eligibleSetIds: hasSets ? eligibleSetIds : [],
                        isActive: p.isActive !== false,
                        listingId: listing.id,
                    };
                });
                await tx.package.createMany({ data: packageData });
            }

            return await tx.listing.findUnique({
                where: { id: listing.id },
                include: {
                    packages: true,
                    sets: { orderBy: [{ price: "asc" }, { position: "asc" }] },
                    blocks: true,
                    user: true,
                },
            });
        });

        if (!createdListing) throw new Error("Listing creation failed");
        const normalizedListing = this.normalizeListingWithRelations(createdListing as ListingWithRelations, true);
        if (!normalizedListing) throw new Error("Listing creation returned incomplete data");
        return normalizedListing;
    }

    static async updateListing(userId: string, listingId: string, body: Record<string, unknown>, allowAdmin = false): Promise<FullListing> {
        const validated = parseListingUpdateBody(body);
        const { packages, sets: validatedSets, ...listingData } = validated;
        let sets = validatedSets;

        // 1. Fetch listing for permission and comparison
        const existingListing = await prisma.listing.findUnique({
            where: { id: listingId },
        });
        if (!existingListing) throw new UserFacingError("Listing not found", 404);
        if (existingListing.userId !== userId && !allowAdmin) throw new UserFacingError("Permission denied", 403);
        const nextListingType = listingData.listingType ?? existingListing.listingType;
        if (!allowAdmin && nextListingType === "CURATED") {
            throw new UserFacingError("Only administrators can manage curated listings");
        }
        const nextPrice = listingData.price ?? existingListing.price;
        const nextPriceRangeMin = "priceRangeMin" in listingData ? listingData.priceRangeMin : existingListing.priceRangeMin;
        const nextPriceRangeMax = "priceRangeMax" in listingData ? listingData.priceRangeMax : existingListing.priceRangeMax;
        if (nextPriceRangeMin != null && nextPriceRangeMax != null && Number(nextPriceRangeMin) > Number(nextPriceRangeMax)) {
            throw new UserFacingError("Minimum price cannot exceed maximum price");
        }
        if (nextListingType === "STANDARD" && Number(nextPrice) < 1) {
            throw new UserFacingError("Price must be at least ₹1 for standard listings");
        }
        if (listingData.hasSets === false && existingListing.hasSets && !Array.isArray(sets)) {
            sets = [];
        }

        // 2. Normalization
        if (listingData.description && isRichTextEmpty(listingData.description as string)) throw new UserFacingError("Description cannot be empty");

        if (listingData.unifiedSetPrice != null) listingData.unifiedSetPrice = Math.round(Number(listingData.unifiedSetPrice));
        if (listingData.price != null) listingData.price = Math.round(Number(listingData.price));
        if (listingData.slug) listingData.slug = slugify(String(listingData.slug));

        // 3. Normalized Location (Privacy Jitter)
        const loc = listingData.actualLocation as { latlng?: unknown; propertyStateCode?: string; state?: string } | null | undefined;
        if (loc) {
            if (!isJsonEqual(loc, existingListing.actualLocation)) {
                const privacySafeLatLng = jitterLatLng(loc.latlng);
                listingData.actualLocation = {
                    ...loc,
                    latlng: privacySafeLatLng || [0, 0]
                } as typeof loc;
                listingData.propertyStateCode =
                    listingData.propertyStateCode ||
                    loc.propertyStateCode ||
                    getGstStateCodeFromStateName(loc.state);
            }
        }
        const sanitizedListingData = sanitizeListingJsonFields(listingData as Record<string, unknown>);

        // Check if main listing actually has changes
        const hasMainListingChanges = Object.keys(sanitizedListingData).some(key => {
            const val = (sanitizedListingData as Record<string, unknown>)[key];
            const existingVal = (existingListing as unknown as Record<string, unknown>)[key];
            if (val && typeof val === "object") return !isJsonEqual(val, existingVal);
            return val !== existingVal;
        });

        const shouldValidateSetCount = Array.isArray(sets) || listingData.hasSets === true;
        const shouldFetchSets = Array.isArray(sets) || Array.isArray(packages) || listingData.hasSets === true;
        const [existingPkgs, existingSets] = await Promise.all([
            Array.isArray(packages) || Array.isArray(sets)
                ? prisma.package.findMany({ where: { listingId } })
                : Promise.resolve([]),
            shouldFetchSets
                ? prisma.listingSet.findMany({ where: { listingId }, orderBy: [{ price: "asc" }, { position: "asc" }] })
                : Promise.resolve([]),
        ]);
        const nextHasSets = typeof listingData.hasSets === "boolean" ? listingData.hasSets : existingListing.hasSets;
        const nextSetCount = Array.isArray(sets) ? sets.length : existingSets.length;
        const nextAdditionalSetPricingType = "additionalSetPricingType" in listingData
            ? listingData.additionalSetPricingType
            : existingListing.additionalSetPricingType;
        const nextSetsHaveSamePrice = typeof listingData.setsHaveSamePrice === "boolean"
            ? listingData.setsHaveSamePrice
            : existingListing.setsHaveSamePrice;
        const nextUnifiedSetPrice = "unifiedSetPrice" in listingData
            ? listingData.unifiedSetPrice
            : existingListing.unifiedSetPrice;
        const nextSets = Array.isArray(sets) ? sets : existingSets;
        if (!nextHasSets && nextSetCount > 0) {
            throw new UserFacingError("Enable sets before adding listing sets");
        }
        if (shouldValidateSetCount && nextHasSets && nextSetCount < 1) {
            throw new UserFacingError("Listings with sets must have at least one set");
        }
        if (nextHasSets && nextSetCount > 1 && !nextAdditionalSetPricingType) {
            throw new UserFacingError("Choose how additional sets are priced");
        }
        if (nextHasSets && nextSetsHaveSamePrice) {
            const unifiedPrice = Number(nextUnifiedSetPrice);
            if (!Number.isInteger(unifiedPrice) || unifiedPrice < 1) {
                throw new UserFacingError("Unified set price must be at least ₹1");
            }
            if (nextSets.some((set) => Number((set as { price?: number }).price) !== unifiedPrice)) {
                throw new UserFacingError("Every set price must match the unified set price");
            }
        }
        const nextPackages = Array.isArray(packages) ? packages : existingPkgs.filter((pkg) => pkg.isActive);
        if (nextHasSets && nextPackages.some((pkg) => {
            const requiredSetCount = Number((pkg as { requiredSetCount?: number | null }).requiredSetCount || 0);
            return requiredSetCount > nextSetCount;
        })) {
            throw new UserFacingError("A package cannot require more sets than the listing contains");
        }

        // 4. Atomic Transaction
        const hasChanges = await prisma.$transaction(async (tx) => {
            let hasChanges = false;

            // Update Main Listing if changed
            if (hasMainListingChanges && Object.keys(sanitizedListingData).length > 0) {
                hasChanges = true;
                await tx.listing.update({
                    where: { id: listingId },
                    data: {
                        ...sanitizedListingData,
                    } as Prisma.ListingUpdateInput,
                });
            }

            // Sync Packages
            if (listingData.hasSets === false && existingListing.hasSets) {
                hasChanges = true;
                await tx.package.updateMany({
                    where: { listingId },
                    data: {
                        requiredSetCount: null,
                        eligibleSetIds: [],
                    },
                });
            }

            if (Array.isArray(packages)) {
                const incomingIds = new Set(packages.map((pkg: { id?: string }) => pkg.id).filter(Boolean));
                const toDelete = existingPkgs.filter(p => p.isActive && !incomingIds.has(p.id)).map(p => p.id);
                const validEligibleSetIds = new Set(
                    Array.isArray(sets)
                        ? sets
                            .map((set) => (set as { id?: string }).id)
                            .filter((id): id is string => typeof id === "string" && existingSets.some((existingSet) => existingSet.id === id))
                        : existingSets.map((set) => set.id)
                );

                if (toDelete.length > 0) {
                    hasChanges = true;
                    const referencedPackageIds = new Set((await tx.reservation.findMany({
                        where: { listingId, setPackageId: { in: toDelete } },
                        select: { setPackageId: true },
                        distinct: ["setPackageId"],
                    })).map((reservation) => reservation.setPackageId).filter((id): id is string => !!id));
                    const unreferencedPackageIds = toDelete.filter((id) => !referencedPackageIds.has(id));
                    if (referencedPackageIds.size > 0) {
                        await tx.package.updateMany({
                            where: { id: { in: [...referencedPackageIds] } },
                            data: { isActive: false },
                        });
                    }
                    if (unreferencedPackageIds.length > 0) {
                        await tx.package.deleteMany({ where: { id: { in: unreferencedPackageIds } } });
                    }
                }

                for (const pkg of packages) {
                    const p = pkg as {
                        title?: string;
                        description?: string | null;
                        originalPrice?: number;
                        offeredPrice?: number;
                        features?: string[];
                        durationHours?: number;
                        requiredSetCount?: number | null;
                        fixedAddOn?: number | null;
                        eligibleSetIds?: string[];
                        isActive?: boolean;
                        id?: string;
                    };
                    const eligibleSetIds = Array.isArray(p.eligibleSetIds) ? p.eligibleSetIds.map(String).filter(Boolean) : [];
                    const invalidEligibleSetIds = nextHasSets ? eligibleSetIds.filter((id) => !validEligibleSetIds.has(id)) : [];
                    if (invalidEligibleSetIds.length > 0) throw new UserFacingError("Invalid package set eligibility");

                    const pData = {
                        title: String(p.title || "").trim(),
                        description: p.description ? String(p.description).trim().slice(0, 500) : null,
                        originalPrice: Math.round(Number(p.originalPrice) || 0),
                        offeredPrice: Math.round(Number(p.offeredPrice) || 0),
                        features: Array.isArray(p.features) ? p.features.map((f: unknown) => String(f)) : [],
                        durationHours: Math.round(Number(p.durationHours) || 0),
                        requiredSetCount: nextHasSets && p.requiredSetCount ? Number(p.requiredSetCount) : null,
                        fixedAddOn: p.fixedAddOn != null ? Math.max(0, Number(p.fixedAddOn)) : null,
                        eligibleSetIds: nextHasSets ? eligibleSetIds : [],
                        isActive: p.isActive !== false,
                        listingId,
                    };

                    if (p.id) {
                        const existing = existingPkgs.find(ep => ep.id === p.id);
                        if (!existing) throw new UserFacingError("Invalid package for listing");
                        if (!isPackageEqual(pData, existing)) {
                            hasChanges = true;
                            await tx.package.update({ where: { id: p.id }, data: pData });
                        }
                    } else {
                        hasChanges = true;
                        await tx.package.create({ data: pData });
                    }
                }
            }

            // Sync Sets
            if (Array.isArray(sets)) {
                const incomingIds = new Set(sets.map((s: { id?: string }) => s.id).filter(Boolean));
                const toDelete = existingSets.filter(s => !incomingIds.has(s.id)).map(s => s.id);

                if (toDelete.length > 0) {
                    hasChanges = true;
                    const now = new Date();
                    const currentIstDate = formatInTimeZone(now, "Asia/Kolkata", "yyyy-MM-dd");
                    const reservationCandidates = await tx.reservation.findMany({
                        where: {
                            listingId,
                            setIds: { hasSome: toDelete },
                            startDate: { gte: new Date(`${currentIstDate}T00:00:00.000Z`) },
                            markedForDeletion: false,
                        },
                        select: { startDate: true, endTime: true },
                    });
                    const hasFutureReservation = reservationCandidates.some((reservation) => {
                        const endAt = parseReservationEndTimeForDate(reservation.startDate, reservation.endTime);
                        return !endAt || endAt.getTime() > now.getTime();
                    });
                    if (hasFutureReservation) {
                        throw new UserFacingError("Cannot delete sets with future reservations");
                    }
                    if (!Array.isArray(packages)) {
                        for (const pkg of existingPkgs) {
                            const eligibleSetIds = pkg.eligibleSetIds.filter((id) => !toDelete.includes(id));
                            if (eligibleSetIds.length !== pkg.eligibleSetIds.length) {
                                await tx.package.update({ where: { id: pkg.id }, data: { eligibleSetIds } });
                            }
                        }
                    }
                    await tx.listingSet.deleteMany({ where: { id: { in: toDelete } } });
                }

                for (let i = 0; i < sets.length; i++) {
                    const setData = sets[i] as { name?: string; description?: string; images?: string[]; price?: number; position?: number; id?: string; aesthetics?: string[]; setFeatures?: string[] };
                    const sData = {
                        name: String(setData.name || "").trim(),
                        description: setData.description || null,
                        images: Array.isArray(setData.images) ? setData.images.filter((img: unknown) => typeof img === "string" && !img.startsWith("blob:")) : [],
                        price: Math.round(Number(setData.price) || 0),
                        position: typeof setData.position === "number" ? setData.position : i,
                        aesthetics: Array.isArray(setData.aesthetics) ? setData.aesthetics.map(String) : [],
                        setFeatures: Array.isArray(setData.setFeatures) ? setData.setFeatures.map(String) : [],
                        listingId,
                    };

                    if (setData.id) {
                        const existing = existingSets.find(es => es.id === setData.id);
                        if (!existing) throw new UserFacingError("Invalid set for listing");
                        if (!isSetEqual(sData, existing)) {
                            hasChanges = true;
                            await tx.listingSet.update({ where: { id: setData.id }, data: sData });
                        }
                    } else {
                        hasChanges = true;
                        await tx.listingSet.create({ data: sData });
                    }
                }
            }

            return hasChanges;
        });

        const updatedListing = await ListingService.findById(listingId, { id: userId, role: allowAdmin ? "ADMIN" : "OWNER" });
        if (!updatedListing) {
            throw new UserFacingError(hasChanges ? "Listing update failed" : "Listing not found", hasChanges ? 500 : 404);
        }
        return updatedListing;
    }

    /**
     * User-initiated Listing Deletion
     */
    static async deleteListing(userId: string, listingId: string, allowAdmin = false): Promise<void> {
        const listing = await prisma.listing.findUnique({
            where: { id: listingId },
            select: { userId: true },
        });
        if (!listing) throw new UserFacingError("Listing not found", 404);
        if (listing.userId !== userId && !allowAdmin) throw new UserFacingError("Permission denied", 403);
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
                accountDeactivatedAt: null,
            }
        });
    }

    /**
     * Calendar Blocking Logic
     */
    static async getBlocks(listingId: string) {
        const blocks = await prisma.listingBlock.findMany({
            where: { listingId },
            orderBy: [{ date: "asc" }, { startTime: "asc" }],
        });
        return blocks.map((block) => ({
            ...block,
            date: block.date.toISOString(),
            createdAt: block.createdAt.toISOString(),
        }));
    }


    static async createBlock(userId: string, listingId: string, data: ListingBlockData, allowAdmin = false) {
        const listing = await prisma.listing.findUnique({
            where: { id: listingId },
            select: { userId: true, sets: { select: { id: true } } },
        });
        if (!listing) throw new UserFacingError("Listing not found", 404);
        if (listing.userId !== userId && !allowAdmin) throw new UserFacingError("Permission denied", 403);

        const { date, startTime, endTime, setIds, reason } = data;
        const validSetIds = new Set(listing.sets.map((set) => set.id));
        if (setIds.some((setId) => !validSetIds.has(setId))) {
            throw new UserFacingError("One or more sets do not belong to this listing");
        }
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
        venueTypes?: string;
        aesthetics?: string;
        setFeatures?: string;
        hasSets?: boolean;
        startDate?: string;
        endDate?: string;
    }): Promise<FullListing[]> {
        const { userId, locationValue, category, type, venueTypes, aesthetics, setFeatures, hasSets, startDate, endDate } = params;

        const query: Prisma.ListingWhereInput = {};

        if (userId) {
            query.userId = userId;
        } else {
            query.active = true;
            query.status = "VERIFIED";
            const hydratableIds = await this.getHydratableListingIds({ active: true, status: "VERIFIED" });
            if (hydratableIds.length === 0) return [];
            query.id = { in: hydratableIds };
        }

        if (category) query.category = category;
        if (locationValue) query.locationValue = locationValue;
        if (type) query.type = { hasSome: type.split(",") };
        if (venueTypes) query.venueTypes = { hasSome: venueTypes.split(",") };
        if (aesthetics) query.aesthetics = { hasSome: aesthetics.split(",") };
        if (setFeatures) query.setFeatures = { hasSome: setFeatures.split(",") };
        if (hasSets) query.hasSets = true;

        if (startDate && endDate) {
            const rangeStart = new Date(startDate);
            const rangeEnd = new Date(endDate);
            if (!Number.isFinite(rangeStart.getTime()) || !Number.isFinite(rangeEnd.getTime()) || rangeStart > rangeEnd) {
                throw new UserFacingError("Invalid listing availability date range");
            }
            query.NOT = {
                reservations: {
                    some: {
                        AND: [
                            { markedForDeletion: false },
                            { status: { in: ["PENDING_APPROVAL", "CONFIRMED", "CHECKED_IN"] } },
                            {
                                startDate: {
                                    gte: rangeStart,
                                    lte: rangeEnd,
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
        limit = Number.isFinite(limit)
            ? Math.min(12, Math.max(1, Math.floor(limit)))
            : 3;
        const hydratableIds = await this.getHydratableListingIds({ active: true, status: "VERIFIED" });
        const count = hydratableIds.length;

        if (count === 0) return [];

        if (count <= limit) {
            const listings = await prisma.listing.findMany({
                where: { id: { in: hydratableIds } },
                include: { packages: true, sets: { orderBy: [{ price: "asc" }, { position: "asc" }] }, user: true },
            });
            return shuffleCopy(listings)
                .map(l => this.normalizeListingWithRelations(l as ListingWithRelations))
                .filter((item): item is FullListing => item !== null);
        }

        const shuffledIds = shuffleCopy(hydratableIds).slice(0, limit);

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

    static async getFavoriteListings(listingIds: string[]): Promise<FullListing[]> {
        const uniqueIds = Array.from(new Set(listingIds.filter((id) => /^[a-f\d]{24}$/i.test(id)))).slice(0, 500);
        if (uniqueIds.length === 0) return [];

        const listings = await prisma.listing.findMany({
            where: { id: { in: uniqueIds }, active: true, status: "VERIFIED" },
            include: {
                packages: true,
                sets: { orderBy: [{ price: "asc" }, { position: "asc" }] },
                user: true,
            },
        });
        const byId = new Map(listings.map((listing) => [listing.id, listing]));
        return uniqueIds
            .map((id) => byId.get(id))
            .filter((listing): listing is NonNullable<typeof listing> => Boolean(listing))
            .map((listing) => this.normalizeListingWithRelations(listing as ListingWithRelations))
            .filter((listing): listing is FullListing => Boolean(listing));
    }

    static async findById(
        listingId: string,
        viewer?: { id: string; role: "CUSTOMER" | "OWNER" | "ADMIN" }
    ): Promise<FullListing | null> {
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
        const includePrivateLocation = Boolean(viewer && (viewer.role === "ADMIN" || viewer.id === listing.userId));
        return this.normalizeListingWithRelations(listing as ListingWithRelations, includePrivateLocation);
    }

    private static normalizeListingWithRelations(l: ListingWithRelations, includePrivateLocation = false): FullListing | null {
        const castJson = <T>(value: unknown, fallback: T): T => {
            if (value === null || value === undefined) return fallback;
            return value as T;
        };

        const normalizedTypes = Array.from(
            new Set(((l.type as string[]) || []).map(normaliseUseCase).filter((t): t is string => t !== null))
        );
        if (!l.user) {
            console.error(`[ListingService] Data integrity violation: Listing ${l.id} missing owner.`);
            return null;
        }

        const {
            verifications: _verifications,
            reviewedAt: _reviewedAt,
            reviewedById: _reviewedById,
            rejectionReason: _rejectionReason,
            curatedSource: _curatedSource,
            contactEmail: _contactEmail,
            notifyEmailSentAt: _notifyEmailSentAt,
            notifyReminderAt: _notifyReminderAt,
            inConversation: _inConversation,
            enquiryCount: _enquiryCount,
            accountDeactivatedAt: _accountDeactivatedAt,
            user,
            ...publicListing
        } = l;

        return {
            ...publicListing,
            createdAt: l.createdAt.toISOString(),
            amenities: (l.amenities as string[]) || [],
            otherAmenities: (l.otherAmenities as string[]) || [],
            type: normalizedTypes,
            addons: castJson<Addon[]>(l.addons, []),
            packages: l.packages
                ?.filter((pkg) => pkg.isActive)
                .map((pkg) => ({ ...pkg, createdAt: pkg.createdAt.toISOString() })) || [],
            operationalDays: castJson<{ start?: string; end?: string } | undefined>(l.operationalDays, undefined),
            operationalHours: castJson<{ start?: string; end?: string } | undefined>(l.operationalHours, undefined),
            actualLocation: includePrivateLocation
                ? castJson<ActualLocation | null>(l.actualLocation, null)
                : sanitizePublicLocation(l.actualLocation),
            ...(includePrivateLocation ? { contactEmail: l.contactEmail } : {}),
            sets: l.sets?.map(set => ({
                ...set,
                createdAt: set.createdAt.toISOString(),
                updatedAt: set.updatedAt.toISOString(),
            })) || [],
            blocks: l.blocks?.map(block => ({
                id: block.id,
                listingId: block.listingId,
                date: block.date.toISOString(),
                startTime: block.startTime,
                endTime: block.endTime,
                setIds: block.setIds,
                createdAt: block.createdAt.toISOString(),
            })) || [],
            carpetArea: l.carpetArea,
            maximumPax: l.maximumPax,
            minimumBookingHours: l.minimumBookingHours,
            avgReviewRating: l.avgReviewRating ?? undefined,
            instantBooking: l.instantBooking,
            videoSrc: l.videoSrc,
            user: {
                id: user.id,
                name: user.name,
                image: user.image,
                profileImage: user.profileImage,
                role: user.role,
                is_verified: user.is_verified,
                googleCalendarConnected: user.googleCalendarConnected,
            },
        };
    }

    static async deleteBlock(userId: string, listingId: string, blockId: string, allowAdmin = false) {
        const block = await prisma.listingBlock.findUnique({
            where: { id: blockId },
            include: { listing: { select: { userId: true } } },
        });
        if (!block) throw new UserFacingError("Block not found", 404);
        if (block.listing.userId !== userId && !allowAdmin) throw new UserFacingError("Permission denied", 403);
        if (block.listingId !== listingId) throw new UserFacingError("Invalid request", 400);

        await prisma.listingBlock.delete({ where: { id: blockId } });
    }
}
