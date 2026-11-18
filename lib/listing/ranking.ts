export type ListingKind = "STANDARD" | "CURATED";

export const DISTANCE_STEP_KM = 0.5;

export const NO_POINT_RANK = Number.MAX_SAFE_INTEGER;

export function distanceStep(distanceKm: number | null): number {
    return distanceKm === null ? NO_POINT_RANK : Math.floor(distanceKm / DISTANCE_STEP_KM);
}

export const LISTING_KIND_RANK: Record<ListingKind, number> = { STANDARD: 1, CURATED: 2 };

export const QUALITY = { maxPhotos: 20, ratingMultiplier: 4, priorRating: 4.3, priorReviews: 5 } as const;

export function smoothedRating(avgReviewRating: number | null, reviewCount: number): number {
    const reviews = avgReviewRating ? reviewCount : 0;
    return (QUALITY.priorReviews * QUALITY.priorRating + reviews * (avgReviewRating ?? 0)) / (QUALITY.priorReviews + reviews);
}

export function listingQuality(photoCount: number, avgReviewRating: number | null, reviewCount: number): number {
    return Math.round(
        Math.min(photoCount, QUALITY.maxPhotos) + smoothedRating(avgReviewRating, reviewCount) * QUALITY.ratingMultiplier
    );
}

export type RankedStudio = {
    distanceKm: number | null;
    listingType: ListingKind;
    photoCount: number;
    avgReviewRating: number | null;
    reviewCount: number;
};

const qualityOf = (studio: RankedStudio) => listingQuality(studio.photoCount, studio.avgReviewRating, studio.reviewCount);

export function compareStudios(a: RankedStudio, b: RankedStudio): number {
    return distanceStep(a.distanceKm) - distanceStep(b.distanceKm)
        || LISTING_KIND_RANK[a.listingType] - LISTING_KIND_RANK[b.listingType]
        || qualityOf(b) - qualityOf(a)
        || (a.distanceKm ?? Number.POSITIVE_INFINITY) - (b.distanceKm ?? Number.POSITIVE_INFINITY);
}
