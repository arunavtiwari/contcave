import { z } from "zod";

import { UserFacingError } from "@/lib/errors";
import type { LatLng } from "@/lib/geo";
import type { StudioFeedFilters } from "@/schemas/listing";
import type { StudioFeedItem } from "@/types/listing";

import type { BrowseSort } from "./browseSort";
import { categoryMatch, findCategory } from "./categories";
import { deriveLocality } from "./locality";
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
    price?: unknown;
    rating?: unknown;
    present?: unknown;
    createdAt?: unknown;
};

/**
 * How the visitor is located and how they asked for the feed to be ordered. `region` comes from
 * a saved/entered location, GPS or the IP city; `origin` only from a precise location (GPS or an
 * entered place), never from IP.
 */
export type FeedSortContext = { region: string | null; origin: LatLng | null; order: BrowseSort };

/**
 * Keyset pagination state. Every field a given order sorts on has to be in here for the
 * "rows after this one" filter to be exact, so which fields are set depends on the order;
 * a cursor is only ever read back under the order that produced it.
 */
export type FeedCursor = {
    /** regionMatch */ r?: 0 | 1;
    /** distance bucket */ b?: number;
    /** presence flag for the ordering key */ h?: 0 | 1;
    /** curated/verified weight */ w?: 1 | 2;
    /** quality score */ q?: number;
    /** distance in metres */ d?: number;
    /** sortable price in rupees */ p?: number;
    /** rating × 100 */ g?: number;
    /** createdAt */ t?: string;
    id: string;
};

type FeedSortField =
    | "regionMatch"
    | "bucket"
    | "present"
    | "weight"
    | "quality"
    | "distance"
    | "price"
    | "rating"
    | "createdAt"
    | "_id";

type FeedSortSpec = ReadonlyArray<readonly [FeedSortField, 1 | -1]>;

export const FEED_PAGE_SIZE = 12;

const MONGO_EARTH_RADIUS_KM = 6378.1;

/**
 * Relevance order. Steps that don't apply are projected as a constant, so they're no-ops:
 * no region known → regionMatch is 0 for everyone; no precise location → bucket and distance are 0.
 * Verified sits *inside* the location groups, so a nearby curated studio isn't pushed below
 * verified studios in another city.
 */
const RECOMMENDED_SORT: FeedSortSpec = [
    ["regionMatch", -1],
    ["bucket", 1],
    ["weight", 1],
    ["quality", -1],
    ["distance", 1],
    ["createdAt", -1],
    ["_id", 1],
];

/**
 * The explicit orders. Each leads with `present`, the flag for "this studio has the thing we're
 * ordering by", so studios with no map point, no price or no rating sort last instead of
 * pretending to be at zero. `_id` closes every order to keep paging stable through ties.
 *
 * `distance` is a plain distance sort: it deliberately drops the region grouping and the curated
 * weight that `recommended` applies, because "Nearest first" has to mean nearest.
 */
const FEED_SORTS: Record<BrowseSort, FeedSortSpec> = {
    recommended: RECOMMENDED_SORT,
    distance: [["present", -1], ["distance", 1], ["_id", 1]],
    price_asc: [["present", -1], ["price", 1], ["_id", 1]],
    price_desc: [["present", -1], ["price", -1], ["_id", 1]],
    rating: [["present", -1], ["rating", -1], ["_id", 1]],
};

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
    r: z.union([z.literal(0), z.literal(1)]).optional(),
    b: z.number().int().min(0).max(NO_POINT_BUCKET).optional(),
    h: z.union([z.literal(0), z.literal(1)]).optional(),
    w: z.union([z.literal(1), z.literal(2)]).optional(),
    q: z.number().int().min(0).max(1000).optional(),
    d: z.number().int().min(0).optional(),
    p: z.number().int().min(0).optional(),
    g: z.number().int().min(0).max(500).optional(),
    t: z.iso.datetime().optional(),
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

const CURSOR_READERS: Record<Exclude<FeedSortField, "_id">, (cursor: FeedCursor) => unknown> = {
    regionMatch: (cursor) => cursor.r,
    bucket: (cursor) => cursor.b,
    present: (cursor) => cursor.h,
    weight: (cursor) => cursor.w,
    quality: (cursor) => cursor.q,
    distance: (cursor) => cursor.d,
    price: (cursor) => cursor.p,
    rating: (cursor) => cursor.g,
    createdAt: (cursor) => (cursor.t === undefined ? undefined : { $date: cursor.t }),
};

/** A cursor missing a field its order sorts on can't be paged from, so it's rejected outright. */
function cursorValue(cursor: FeedCursor, field: FeedSortField): unknown {
    if (field === "_id") return { $oid: cursor.id };
    const value = CURSOR_READERS[field](cursor);
    if (value === undefined) throw new UserFacingError("Invalid feed cursor", 400);
    return value;
}

function afterCursor(cursor: FeedCursor, spec: FeedSortSpec): MongoDocument {
    return {
        $or: spec.map(([field, direction], index) => ({
            ...Object.fromEntries(spec.slice(0, index).map(([prior]) => [prior, cursorValue(cursor, prior)])),
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

/**
 * What a card shows as the price, and what the price sorts on: the hourly rate for bookable
 * studios, and the bottom of the quoted range for curated ones, which carry no `price`.
 */
const SORT_PRICE = {
    $let: {
        vars: { hourly: { $ifNull: ["$price", 0] }, quoted: { $ifNull: ["$priceRangeMin", 0] } },
        in: { $cond: [{ $gt: ["$$hourly", 0] }, "$$hourly", "$$quoted"] },
    },
};

/** Rating as an integer so it round-trips through the cursor without float drift. */
const SORT_RATING = { $round: [{ $multiply: [{ $ifNull: ["$avgReviewRating", 0] }, 100] }, 0] };

/** "Has the thing this order sorts by", so studios that don't sort last rather than first. */
function presentExpression(order: BrowseSort, hasOrigin: boolean): MongoDocument {
    switch (order) {
        case "distance":
            return hasOrigin ? { $cond: [NO_DISTANCE, 0, 1] } : { $literal: 1 };
        case "price_asc":
        case "price_desc":
            return { $cond: [{ $gt: [SORT_PRICE, 0] }, 1, 0] };
        case "rating":
            return { $cond: [{ $gt: [SORT_RATING, 0] }, 1, 0] };
        default:
            return { $literal: 0 };
    }
}

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
    const { origin, order } = sort;
    // $geoNear runs whenever there's an origin, even under a price or rating order: the cards
    // show how far away each studio is regardless of what the list is sorted by.
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

    const spec = FEED_SORTS[order];

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
                price: SORT_PRICE,
                rating: SORT_RATING,
                present: presentExpression(order, Boolean(origin)),
                createdAt: { $ifNull: ["$createdAt", EPOCH] },
            },
        },
        ...(after ? [{ $match: afterCursor(after, spec) }] : []),
        { $sort: Object.fromEntries(spec) },
        ...(limit ? [{ $limit: limit }] : []),
    ];
}

const CURSOR_WRITERS: Record<Exclude<FeedSortField, "_id">, (row: FeedRow, cursor: FeedCursor) => void> = {
    regionMatch: (row, cursor) => { cursor.r = readRawNumber(row.regionMatch) === 1 ? 1 : 0; },
    bucket: (row, cursor) => { cursor.b = readRawNumber(row.bucket) || 0; },
    present: (row, cursor) => { cursor.h = readRawNumber(row.present) === 1 ? 1 : 0; },
    weight: (row, cursor) => { cursor.w = readRawNumber(row.weight) === 2 ? 2 : 1; },
    quality: (row, cursor) => { cursor.q = readRawNumber(row.quality) || 0; },
    distance: (row, cursor) => { cursor.d = readRawNumber(row.distance) || 0; },
    price: (row, cursor) => { cursor.p = readRawNumber(row.price) || 0; },
    rating: (row, cursor) => { cursor.g = readRawNumber(row.rating) || 0; },
    createdAt: (row, cursor) => { cursor.t = readRawDate(row.createdAt); },
};

/** Records only the fields this order sorts on, which is exactly what paging it needs. */
export function cursorFromRow(row: FeedRow, order: BrowseSort): FeedCursor {
    const id = readRawId(row);
    if (!id) throw new Error("Feed row is missing its id");
    const cursor: FeedCursor = { id };
    for (const [field] of FEED_SORTS[order]) {
        if (field !== "_id") CURSOR_WRITERS[field](row, cursor);
    }
    return cursor;
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

type FeedItemSource = Omit<StudioFeedItem, "avgReviewRating" | "actualLocation" | "locality"> & {
    avgReviewRating?: number | null;
    actualLocation?: unknown;
};

export function toStudioFeedItem(listing: FeedItemSource): StudioFeedItem {
    const actual = listing.actualLocation as { state?: unknown; display_name?: unknown } | null | undefined;
    const state = actual?.state;
    return {
        id: listing.id,
        locality: deriveLocality({
            displayName: typeof actual?.display_name === "string" ? actual.display_name : null,
            city: listing.locationValue,
        }),
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
