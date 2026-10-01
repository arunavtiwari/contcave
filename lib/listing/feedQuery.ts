import { z } from "zod";

import { UserFacingError } from "@/lib/errors";
import type { LatLng } from "@/lib/geo";
import type { StudioFeedFilters } from "@/schemas/listing";
import type { StudioFeedItem } from "@/types/listing";

import { categoryMatch, findCategory } from "./categories";

type MongoDocument = Record<string, unknown>;
type RawId = string | { $oid?: unknown };

export type FeedRow = {
    _id?: RawId;
    hasPoint?: unknown;
    distance?: unknown;
    weight?: unknown;
    createdAt?: unknown;
};

export type FeedCursor = { p: 0 | 1; d: number; w: 1 | 2; t: string; id: string };

type FeedSortField = "hasPoint" | "distance" | "weight" | "createdAt" | "_id";

export const FEED_PAGE_SIZE = 12;

const MONGO_EARTH_RADIUS_KM = 6378.1;

const FEED_SORT: ReadonlyArray<readonly [FeedSortField, 1 | -1]> = [
    ["hasPoint", -1],
    ["distance", 1],
    ["weight", 1],
    ["createdAt", -1],
    ["_id", 1],
];

const HYDRATABLE_INT_FIELDS = [
    "price",
    "carpetArea",
    "minimumBookingHours",
    "maximumPax",
    "unifiedSetPrice",
    "priceRangeMin",
    "priceRangeMax",
    "enquiryCount",
] as const;

const NUMERIC_OR_EMPTY = [{ $exists: false }, null, { $type: "int" }, { $type: "long" }];

const TAXONOMY_FILTERS = ["type", "venueTypes", "aesthetics", "setFeatures"] as const;

const EPOCH = { $date: "1970-01-01T00:00:00.000Z" };

const WEIGHT = { $cond: [{ $eq: ["$listingType", "CURATED"] }, 2, 1] };

const feedCursorSchema = z.object({
    p: z.union([z.literal(0), z.literal(1)]),
    d: z.number().int().min(0),
    w: z.union([z.literal(1), z.literal(2)]),
    t: z.iso.datetime(),
    id: z.string().regex(/^[a-f\d]{24}$/i),
});

export function hydratableListingFilter(
    params: { active?: boolean; status?: string; listingType?: "STANDARD" | "CURATED" } = { active: true }
): MongoDocument {
    const filter: MongoDocument = {
        $and: [
            { $or: [{ archivedAt: { $exists: false } }, { archivedAt: null }] },
            ...HYDRATABLE_INT_FIELDS.map((field) => ({ $or: NUMERIC_OR_EMPTY.map((condition) => ({ [field]: condition })) })),
        ],
    };

    if (typeof params.active === "boolean") filter.active = params.active;
    if (params.status) filter.status = params.status;
    if (params.listingType === "CURATED") filter.listingType = "CURATED";
    if (params.listingType === "STANDARD") filter.listingType = { $ne: "CURATED" };

    return filter;
}

export function readRawId(raw: { _id?: RawId }): string | null {
    const id = raw._id;
    if (typeof id === "string") return id;
    if (id && typeof id === "object" && typeof id.$oid === "string") return id.$oid;
    return null;
}

const readRawNumber = (value: unknown): number => {
    if (typeof value === "number") return value;
    const wrapped = value as { $numberDouble?: unknown; $numberInt?: unknown; $numberLong?: unknown } | null;
    return Number(wrapped?.$numberDouble ?? wrapped?.$numberInt ?? wrapped?.$numberLong);
};

const readRawDate = (value: unknown): string => {
    const raw = (value as { $date?: unknown } | null)?.$date ?? value;
    const epochMs = (raw as { $numberLong?: unknown } | null)?.$numberLong;
    const date = new Date(typeof epochMs === "string" ? Number(epochMs) : (raw as string));
    return date.toISOString();
};

function publicListingMatch(filters: StudioFeedFilters, excludeIds: string[] = []): MongoDocument {
    const clauses: MongoDocument[] = [hydratableListingFilter({ active: true, status: "VERIFIED" })];

    if (excludeIds.length) clauses.push({ _id: { $nin: excludeIds.map((id) => ({ $oid: id })) } });
    if (filters.locationValues) clauses.push({ locationValue: { $in: filters.locationValues } });
    if (filters.category) clauses.push({ category: filters.category });
    for (const field of TAXONOMY_FILTERS) {
        const terms = filters[field];
        if (terms) clauses.push({ [field]: { $in: terms } });
    }
    if (filters.hasSets) clauses.push({ hasSets: true });
    if (filters.near && filters.radiusKm) {
        const [lat, lng] = filters.near;
        clauses.push({ locationPoint: { $geoWithin: { $centerSphere: [[lng, lat], filters.radiusKm / MONGO_EARTH_RADIUS_KM] } } });
    }
    if (filters.studioCategory) {
        const category = findCategory(filters.studioCategory);
        if (!category) throw new UserFacingError("Unknown studio category", 400);
        clauses.push(categoryMatch(category));
    }

    return { $and: clauses };
}

const cursorValue = (cursor: FeedCursor, field: FeedSortField) =>
    ({
        hasPoint: cursor.p,
        distance: cursor.d,
        weight: cursor.w,
        createdAt: { $date: cursor.t },
        _id: { $oid: cursor.id },
    })[field];

function afterCursor(cursor: FeedCursor): MongoDocument {
    return {
        $or: FEED_SORT.map(([field, direction], index) => ({
            ...Object.fromEntries(FEED_SORT.slice(0, index).map(([prior]) => [prior, cursorValue(cursor, prior)])),
            [field]: { [direction === 1 ? "$gt" : "$lt"]: cursorValue(cursor, field) },
        })),
    };
}

export const feedCandidatePipeline = (filters: StudioFeedFilters): MongoDocument[] => [
    { $match: publicListingMatch(filters) },
    { $project: { _id: 1 } },
];

export function buildFeedPipeline({
    filters,
    origin,
    after,
    limit,
    excludeIds,
}: {
    filters: StudioFeedFilters;
    origin: LatLng | null;
    after: FeedCursor | null;
    limit?: number;
    excludeIds?: string[];
}): MongoDocument[] {
    const match = publicListingMatch(filters, excludeIds);
    const unlocated = { $match: { $and: [match, { locationPoint: null }] } };
    const source = !origin
        ? [{ $match: match }]
        : after?.p === 0
            ? [unlocated]
            : [
                {
                    $geoNear: {
                        near: { type: "Point", coordinates: [origin[1], origin[0]] },
                        key: "locationPoint",
                        distanceField: "distance",
                        spherical: true,
                        query: match,
                        ...(after ? { minDistance: Math.max(0, after.d - 1) } : {}),
                    },
                },
                { $unionWith: { coll: "Listing", pipeline: [unlocated] } },
            ];

    return [
        ...source,
        {
            $project: {
                _id: 1,
                hasPoint: origin ? { $cond: [{ $eq: [{ $type: "$distance" }, "missing"] }, 0, 1] } : { $literal: 0 },
                distance: origin ? { $round: [{ $ifNull: ["$distance", 0] }, 0] } : { $literal: 0 },
                weight: WEIGHT,
                createdAt: { $ifNull: ["$createdAt", EPOCH] },
            },
        },
        ...(after ? [{ $match: afterCursor(after) }] : []),
        { $sort: Object.fromEntries(FEED_SORT) },
        ...(limit ? [{ $limit: limit }] : []),
    ];
}

export function cursorFromRow(row: FeedRow): FeedCursor {
    const id = readRawId(row);
    if (!id) throw new Error("Feed row is missing its id");
    return {
        p: readRawNumber(row.hasPoint) === 1 ? 1 : 0,
        d: readRawNumber(row.distance),
        w: readRawNumber(row.weight) === 2 ? 2 : 1,
        t: readRawDate(row.createdAt),
        id,
    };
}

export const distanceKmOf = (row: FeedRow | undefined) =>
    row && readRawNumber(row.hasPoint) === 1 ? readRawNumber(row.distance) / 1000 : null;

export const encodeFeedCursor = (cursor: FeedCursor) => Buffer.from(JSON.stringify(cursor)).toString("base64url");

const parseCursorJson = (value: string): unknown => {
    try {
        return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    } catch {
        return null;
    }
};

export function decodeFeedCursor(value: string): FeedCursor {
    const parsed = feedCursorSchema.safeParse(parseCursorJson(value));
    if (!parsed.success) throw new UserFacingError("Invalid feed cursor", 400);
    return parsed.data;
}

type FeedItemSource = Omit<StudioFeedItem, "avgReviewRating" | "actualLocation"> & {
    avgReviewRating?: number | null;
    actualLocation?: unknown;
};

export function toStudioFeedItem(listing: FeedItemSource): StudioFeedItem {
    const state = (listing.actualLocation as { state?: unknown } | null | undefined)?.state;
    return {
        id: listing.id,
        slug: listing.slug,
        title: listing.title,
        imageSrc: listing.imageSrc.slice(0, 5),
        price: listing.price,
        locationValue: listing.locationValue,
        category: listing.category,
        venueTypes: listing.venueTypes,
        avgReviewRating: listing.avgReviewRating ?? undefined,
        status: listing.status,
        hasSets: listing.hasSets,
        carpetArea: listing.carpetArea,
        maximumPax: listing.maximumPax,
        listingType: listing.listingType,
        priceRangeMin: listing.priceRangeMin,
        priceRangeMax: listing.priceRangeMax,
        actualLocation: typeof state === "string" && state.trim() ? { state: state.trim() } : null,
    };
}
