import { UserFacingError } from "@/lib/errors";
import type { LatLng } from "@/lib/geo";
import type { StudioFeedFilters } from "@/schemas/listing";
import type { StudioFeedItem } from "@/types/listing";

import { categoryMatch, findCategory } from "./categories";
import type { FeedSort } from "./feedSort";
import { findRegion, regionCityKeys } from "./regions";
import { findShootPurpose, shootPurposeMatch } from "./shootPurposes";
import { locationState } from "./utils";

type MongoDocument = Record<string, unknown>;
type RawId = string | { $oid?: unknown };

export type FeedRow = { _id?: RawId };

/**
 * How the visitor is located. `region` comes from a saved/entered location, GPS or IP;
 * `origin` from a precise location (GPS or an entered place) or, marked `approximate`, from IP.
 */
export type FeedSortContext = { region: string | null; origin: LatLng | null; approximate?: boolean };

export const UNLOCATED_SORT: FeedSortContext = { region: null, origin: null };

type FeedSortField = "regionMatch" | "bucket" | "weight" | "quality" | "distance" | "hasPrice" | "price" | "createdAt" | "_id";

type FeedSortSpec = ReadonlyArray<readonly [FeedSortField, 1 | -1]>;

export type FeedPageRow = { rows?: FeedRow[]; total?: { total?: unknown }[] };

export const FEED_PAGE_SIZE = 20;

const MONGO_EARTH_RADIUS_KM = 6378.1;

const NEWEST_FIRST: FeedSortSpec = [
    ["createdAt", -1],
    ["_id", 1],
];

/**
 * Relevance order. Steps that don't apply are projected as a constant, so they're no-ops:
 * no region known → regionMatch is 0 for everyone; no precise location → bucket and distance are 0.
 * Verified sits *inside* the location groups, so a nearby curated studio isn't pushed below
 * verified studios in another city.
 */
const RELEVANCE_FIRST: FeedSortSpec = [
    ["regionMatch", -1],
    ["bucket", 1],
    ["weight", 1],
    ["quality", -1],
    ["distance", 1],
    ...NEWEST_FIRST,
];

const PRICE_SORTS: Record<FeedSort, FeedSortSpec> = {
    price_asc: [["hasPrice", -1], ["price", 1], ...NEWEST_FIRST],
    price_desc: [["hasPrice", -1], ["price", -1], ...NEWEST_FIRST],
};

const feedSortSpec = (sort: FeedSort | undefined) => (sort ? PRICE_SORTS[sort] : RELEVANCE_FIRST);

/**
 * Distance buckets in metres; studios with no map point last. A precise location ranks by area
 * (0–5, 5–15, 15–30, 30+ km). An IP location is only right to the city, so it ranks by city scale
 * (0–50, 50–300, 300–1000, 1000+ km) and leaves the order inside a city to listing quality.
 */
const DISTANCE_BUCKETS_M = {
    precise: [5_000, 15_000, 30_000],
    approximate: [50_000, 300_000, 1_000_000],
} as const;
const NO_POINT_BUCKET = DISTANCE_BUCKETS_M.precise.length + 1;
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

const positiveOrNull = (field: string) => ({ $cond: [{ $gt: [field, 0] }, field, null] });

const LISTED_PRICE = {
    $cond: [
        { $eq: ["$listingType", "CURATED"] },
        { $cond: [{ $gt: ["$priceRangeMax", 0] }, positiveOrNull("$priceRangeMin"), null] },
        positiveOrNull("$price"),
    ],
};

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

export const readRawNumber = (value: unknown): number => {
    if (typeof value === "number") return value;
    const wrapped = value as { $numberDouble?: unknown; $numberInt?: unknown; $numberLong?: unknown } | null;
    return Number(wrapped?.$numberDouble ?? wrapped?.$numberInt ?? wrapped?.$numberLong);
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

const distanceBucket = (limits: readonly number[]) => ({
    $switch: {
        branches: [
            { case: NO_DISTANCE, then: NO_POINT_BUCKET },
            ...limits.map((limit, index) => ({ case: { $lt: ["$distance", limit] }, then: index })),
        ],
        default: limits.length,
    },
});

type FeedPipelineParams = {
    filters: StudioFeedFilters;
    sort: FeedSortContext;
    limit?: number;
    excludeIds?: string[];
};

export function buildFeedPipeline({ filters, sort, limit, excludeIds }: FeedPipelineParams): MongoDocument[] {
    const match = publicListingMatch(filters, excludeIds);
    const { origin } = sort;
    const unlocated = { $match: { $and: [match, { locationPoint: null }] } };
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
            { $unionWith: { coll: "Listing", pipeline: [unlocated] } },
        ];

    return [
        ...source,
        {
            $project: {
                _id: 1,
                regionMatch: regionMatchExpression(sort.region),
                bucket: origin ? distanceBucket(DISTANCE_BUCKETS_M[sort.approximate ? "approximate" : "precise"]) : { $literal: 0 },
                distance: origin ? { $round: [{ $ifNull: ["$distance", NO_POINT_DISTANCE] }, 0] } : { $literal: 0 },
                weight: WEIGHT,
                quality: QUALITY_SCORE,
                price: LISTED_PRICE,
                createdAt: { $ifNull: ["$createdAt", EPOCH] },
            },
        },
        { $addFields: { hasPrice: { $cond: [{ $eq: ["$price", null] }, 0, 1] } } },
        { $sort: Object.fromEntries(feedSortSpec(filters.sort)) },
        ...(limit ? [{ $limit: limit }] : []),
    ];
}

export const buildFeedPagePipeline = ({ skip, limit, ...params }: FeedPipelineParams & { skip: number; limit: number }): MongoDocument[] => [
    ...buildFeedPipeline(params),
    {
        $facet: {
            rows: [...(skip ? [{ $skip: skip }] : []), { $limit: limit }],
            total: [{ $count: "total" }],
        },
    },
];

type FeedItemSource = Omit<StudioFeedItem, "avgReviewRating" | "actualLocation"> & {
    avgReviewRating?: number | null;
    actualLocation?: unknown;
};

export function toStudioFeedItem(listing: FeedItemSource): StudioFeedItem {
    const state = locationState(listing.actualLocation);
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
        actualLocation: state ? { state } : null,
    };
}
