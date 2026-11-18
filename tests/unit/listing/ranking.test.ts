import { describe, expect, it } from "vitest";

import { compareStudios, distanceStep, listingQuality, NO_POINT_RANK, type RankedStudio, smoothedRating } from "@/lib/listing/ranking";

const studio = (overrides: Partial<RankedStudio> = {}): RankedStudio => ({
    distanceKm: 2,
    listingType: "STANDARD",
    photoCount: 5,
    avgReviewRating: null,
    reviewCount: 0,
    ...overrides,
});

const order = (...list: RankedStudio[]) => [...list].sort(compareStudios);

describe("shared studio ranking", () => {
    it("starts every studio at the prior rating and lets reviews take over", () => {
        expect(smoothedRating(null, 0)).toBe(4.3);
        expect(smoothedRating(5, 1)).toBeCloseTo(4.42, 2);
        expect(smoothedRating(5, 50)).toBeCloseTo(4.94, 2);
        expect(smoothedRating(3, 20)).toBeCloseTo(3.26, 2);
        expect(smoothedRating(0, 3)).toBe(4.3);
    });

    it("scores quality as capped photos plus the smoothed rating × 4", () => {
        expect(listingQuality(35, null, 0)).toBe(37);
        expect(listingQuality(3, 5, 50)).toBe(23);
    });

    it("does not let one lucky review beat a well-reviewed studio", () => {
        const lucky = studio({ avgReviewRating: 5, reviewCount: 1 });
        const proven = studio({ avgReviewRating: 4.8, reviewCount: 40 });
        expect(order(lucky, proven)).toEqual([proven, lucky]);
    });

    it("ranks a chosen point in 0.5 km steps, so a nearer curated studio beats a farther verified one", () => {
        expect([0, 0.49, 0.5, 0.99, 4.6].map(distanceStep)).toEqual([0, 0, 1, 1, 9]);
        expect(distanceStep(null)).toBe(NO_POINT_RANK);
        const curatedNear = studio({ distanceKm: 0.75, listingType: "CURATED" });
        const verifiedFar = studio({ distanceKm: 1.4, photoCount: 20, avgReviewRating: 5, reviewCount: 30 });
        expect(order(verifiedFar, curatedNear)).toEqual([curatedNear, verifiedFar]);
    });

    it("orders studios in the same step by verified, then quality, then exact distance", () => {
        const curated = studio({ listingType: "CURATED", photoCount: 20, avgReviewRating: 5, reviewCount: 30 });
        const verified = studio({ distanceKm: 2.4 });
        expect(order(curated, verified)).toEqual([verified, curated]);

        const fuller = studio({ distanceKm: 2.4, photoCount: 15 });
        const plain = studio({ distanceKm: 2.1 });
        expect(order(plain, fuller)).toEqual([fuller, plain]);

        const near = studio({ distanceKm: 2.1 });
        const far = studio({ distanceKm: 2.4 });
        expect(order(far, near)).toEqual([near, far]);
    });
});
