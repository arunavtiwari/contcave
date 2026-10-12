import { UserFacingError } from "@/lib/errors";
import type { LatLng } from "@/lib/geo";
import type { StudioFeedFilters } from "@/schemas/listing";
import type { StudioFeedItem } from "@/types/listing";

import { categoryMatch, findCategory } from "./categories";
import type { FeedSort } from "./feedSort";
import { locationState } from "./utils";

type MongoDocument = Record<string, unknown>;
type RawId = string | { $oid?: unknown };

export type FeedRow = { _id?: RawId; hasPoint?: unknown; distance?: unknown };

type FeedSortField = "hasPoint" | "distance" | "weight" | "hasPrice" | "price" | "createdAt" | "_id";

type FeedSortSpec = ReadonlyArray<readonly [FeedSortField, 1 | -1]>;

export type FeedPageRow = { rows?: FeedRow[]; first?: FeedRow[]; total?: { total?: unknown }[] };

export const FEED_PAGE_SIZE = 20;

const MONGO_EARTH_RADIUS_KM = 6378.1;

const NEWEST_FIRST: FeedSortSpec = [
    ["createdAt", -1],
    ["_id", 1],
];

const NEAREST_FIRST: FeedSortSpec = [["hasPoint", -1], ["distance", 1], ["weight", 1], ...NEWEST_FIRST];

const PRICE_SORTS: Record<FeedSort, FeedSortSpec> = {
    price_asc: [["hasPrice", -1], ["price", 1], ...NEWEST_FIRST],
    price_desc: [["hasPrice", -1], ["price", -1], ...NEWEST_FIRST],
};

const feedSortSpec = (sort: FeedSort | undefined) => (sort ? PRICE_SORTS[sort] : NEAREST_FIRST);

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

export const feedCandidatePipeline = (filters: StudioFeedFilters): MongoDocument[] => [
    { $match: publicListingMatch(filters) },
    { $project: { _id: 1 } },
];

type FeedPipelineParams = {
    filters: StudioFeedFilters;
    origin: LatLng | null;
    limit?: number;
    excludeIds?: string[];
};

export function buildFeedPipeline({ filters, origin, limit, excludeIds }: FeedPipelineParams): MongoDocument[] {
    const match = publicListingMatch(filters, excludeIds);
    const sort = feedSortSpec(filters.sort);
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
                hasPoint: origin ? { $cond: [{ $eq: [{ $type: "$distance" }, "missing"] }, 0, 1] } : { $literal: 0 },
                distance: origin ? { $round: [{ $ifNull: ["$distance", 0] }, 0] } : { $literal: 0 },
                weight: WEIGHT,
                price: LISTED_PRICE,
                createdAt: { $ifNull: ["$createdAt", EPOCH] },
            },
        },
        { $addFields: { hasPrice: { $cond: [{ $eq: ["$price", null] }, 0, 1] } } },
        { $sort: Object.fromEntries(sort) },
        ...(limit ? [{ $limit: limit }] : []),
    ];
}

export const buildFeedPagePipeline = ({ skip, limit, ...params }: FeedPipelineParams & { skip: number; limit: number }): MongoDocument[] => [
    ...buildFeedPipeline(params),
    {
        $facet: {
            rows: [...(skip ? [{ $skip: skip }] : []), { $limit: limit }],
            first: [{ $limit: 1 }],
            total: [{ $count: "total" }],
        },
    },
];

export const distanceKmOf = (row: FeedRow | undefined) =>
    row && readRawNumber(row.hasPoint) === 1 ? readRawNumber(row.distance) / 1000 : null;

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
