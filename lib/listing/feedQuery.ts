import { z } from "zod";

import { UserFacingError } from "@/lib/errors";
import type { LatLng } from "@/lib/geo";
import type { StudioFeedFilters } from "@/schemas/listing";
import type { StudioFeedItem } from "@/types/listing";

import { categoryMatch, findCategory } from "./categories";
import { findRegion, regionCityKeys } from "./regions";
import { findShootPurpose, shootPurposeMatch } from "./shootPurposes";

type MongoDocument = Record<string, unknown>;
type RawId = string | { $oid?: unknown };

export type FeedRow = {
    _id?: RawId;
    regionMatch?: unknown;
    bucket?: unknown;
    hasPoint?: unknown;
    distance?: unknown;
    weight?: unknown;
    quality?: unknown;
    createdAt?: unknown;
};

/**
 * How the visitor is located. `region` comes from a saved/entered location, GPS or the IP city;
 * `origin` only from a precise location (GPS or an entered place), never from IP.
 */
export type FeedSortContext = { region: string | null; origin: LatLng | null };

export type FeedCursor = { r: 0 | 1; b: number; w: 1 | 2; q: number; d: number; t: string; id: string };

type FeedSortField = "regionMatch" | "bucket" | "weight" | "quality" | "distance" | "createdAt" | "_id";

export const FEED_PAGE_SIZE = 12;

const MONGO_EARTH_RADIUS_KM = 6378.1;

/**
 * Relevance order. Steps that don't apply are projected as a constant, so they're no-ops:
 * no region known → regionMatch is 0 for everyone; no precise location → bucket and distance are 0.
 * Verified sits *inside* the location groups, so a nearby curated studio isn't pushed below
 * verified studios in another city.
 */
const FEED_SORT: ReadonlyArray<readonly [FeedSortField, 1 | -1]> = [
    ["regionMatch", -1],
    ["bucket", 1],
    ["weight", 1],
    ["quality", -1],
    ["distance", 1],
    ["createdAt", -1],
    ["_id", 1],
];

/** Distance buckets in metres: 0–5 km, 5–15 km, 15–30 km, 30+ km; studios with no map point last. */
const DISTANCE_BUCKETS_M = [5_000, 15_000, 30_000];
const NO_POINT_BUCKET = DISTANCE_BUCKETS_M.length + 1;
const NO_POINT_DISTANCE = 1_000_000_000;

/**
 * Listing quality, higher first. A starting point while there are few reviews: photo count
 * (capped at 20) plus average rating × 4 (up to 20). Tune here; nothing else depends on the scale.
 */
const QUALITY_SCORE = {
    $round: [
        {
            $add: [
                { $min: [{ $size: { $ifNull: ["$imageSrc", []] } }, 20] },
                { $multiply: [{ $ifNull: ["$avgReviewRating", 0] }, 4] },
            ],
        },
        0,
    ],
};

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
    r: z.union([z.literal(0), z.literal(1)]),
    b: z.number().int().min(0).max(NO_POINT_BUCKET),
    w: z.union([z.literal(1), z.literal(2)]),
    q: z.number().int().min(0).max(1000),
    d: z.number().int().min(0),
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
        if (!terms) continue;
        // Studios with sets keep aesthetics and set features on each set, not on the listing,
        // so those filters also match listings whose sets carry the tag (resolved by the caller).
        const setListingIds = field === "aesthetics"
            ? filters.aestheticSetListingIds
            : field === "setFeatures"
                ? filters.setFeatureSetListingIds
                : undefined;
        clauses.push(setListingIds?.length
            ? { $or: [{ [field]: { $in: terms } }, { _id: { $in: setListingIds.map((id) => ({ $oid: id })) } }] }
            : { [field]: { $in: terms } });
    }
    if (filters.hasSets) clauses.push({ hasSets: true });
    if (filters.near && filters.radiusKm) {
        const [lat, lng] = filters.near;
        clauses.push({ locationPoint: { $geoWithin: { $centerSphere: [[lng, lat], filters.radiusKm / MONGO_EARTH_RADIUS_KM] } } });
    }
    const purpose = findShootPurpose(filters.purpose);
    if (purpose) clauses.push(shootPurposeMatch(purpose, filters.purposeSetListingIds));
    if (filters.studioCategory) {
        const category = findCategory(filters.studioCategory);
        if (!category) throw new UserFacingError("Unknown studio category", 400);
        clauses.push(categoryMatch(category));
    }

    return { $and: clauses };
}

const cursorValue = (cursor: FeedCursor, field: FeedSortField) =>
    ({
        regionMatch: cursor.r,
        bucket: cursor.b,
        weight: cursor.w,
        quality: cursor.q,
        distance: cursor.d,
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

const NO_DISTANCE = { $eq: [{ $type: "$distance" }, "missing"] };

function regionMatchExpression(regionSlug: string | null) {
    const region = findRegion(regionSlug);
    if (!region) return { $literal: 0 };
    return { $cond: [{ $in: [{ $toLower: { $ifNull: ["$locationValue", ""] } }, regionCityKeys(region)] }, 1, 0] };
}

const DISTANCE_BUCKET = {
    $switch: {
        branches: [
            { case: NO_DISTANCE, then: NO_POINT_BUCKET },
            ...DISTANCE_BUCKETS_M.map((limit, index) => ({ case: { $lt: ["$distance", limit] }, then: index })),
        ],
        default: DISTANCE_BUCKETS_M.length,
    },
};

export function buildFeedPipeline({
    filters,
    sort,
    after,
    limit,
    excludeIds,
}: {
    filters: StudioFeedFilters;
    sort: FeedSortContext;
    after: FeedCursor | null;
    limit?: number;
    excludeIds?: string[];
}): MongoDocument[] {
    const match = publicListingMatch(filters, excludeIds);
    const { origin } = sort;
    const source = !origin
        ? [{ $match: match }]
        : [
            {
                $geoNear: {
                    near: { type: "Point", coordinates: [origin[1], origin[0]] },
                    key: "locationPoint",
                    distanceField: "distance",
                    spherical: true,
                    query: match,
                },
            },
            { $unionWith: { coll: "Listing", pipeline: [{ $match: { $and: [match, { locationPoint: null }] } }] } },
        ];

    return [
        ...source,
        {
            $project: {
                _id: 1,
                regionMatch: regionMatchExpression(sort.region),
                bucket: origin ? DISTANCE_BUCKET : { $literal: 0 },
                hasPoint: origin ? { $cond: [NO_DISTANCE, 0, 1] } : { $literal: 0 },
                distance: origin ? { $round: [{ $ifNull: ["$distance", NO_POINT_DISTANCE] }, 0] } : { $literal: 0 },
                weight: WEIGHT,
                quality: QUALITY_SCORE,
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
        r: readRawNumber(row.regionMatch) === 1 ? 1 : 0,
        b: readRawNumber(row.bucket) || 0,
        w: readRawNumber(row.weight) === 2 ? 2 : 1,
        q: readRawNumber(row.quality) || 0,
        d: readRawNumber(row.distance) || 0,
        t: readRawDate(row.createdAt),
        id,
    };
}

export const distanceKmOf = (row: FeedRow | undefined) =>
    row && readRawNumber(row.hasPoint) === 1 ? readRawNumber(row.distance) / 1000 : null;

/** Closest located studio among the rows; verified-first ordering means it may not be the first row. */
export function nearestKmOf(rows: FeedRow[]): number | null {
    const distances = rows.map(distanceKmOf).filter((km): km is number => km !== null);
    return distances.length ? Math.min(...distances) : null;
}

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
