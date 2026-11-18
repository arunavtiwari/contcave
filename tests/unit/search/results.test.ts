import { describe, expect, it } from "vitest";

import { buildOffer } from "@/lib/search/offer";
import { type Evaluated, selectResults } from "@/lib/search/results";
import { fitScore } from "@/lib/search/score";
import type { ResultFacts, SearchCandidate } from "@/lib/search/types";
import { EMPTY_QUERY, type ParsedQuery } from "@/schemas/search";

const candidate = (overrides: Partial<SearchCandidate>): SearchCandidate => ({
    id: "x",
    slug: "studio",
    title: "Studio",
    imageSrc: ["a.jpg", "b.jpg", "c.jpg"],
    locationValue: "Delhi",
    listingType: "STANDARD",
    category: "Shoot Studio",
    price: 1500,
    hasSets: false,
    additionalSetPricingType: null,
    sets: [],
    packages: [],
    type: [],
    venueTypes: [],
    aesthetics: [],
    setFeatures: [],
    facilities: [],
    maximumPax: 10,
    minimumBookingHours: 2,
    instantBooking: false,
    avgReviewRating: null,
    reviewCount: 0,
    carpetArea: null,
    point: null,
    priceRangeMin: null,
    priceRangeMax: null,
    ...overrides,
});

/** A search that names only an area: no dates, budget, features or crew size. */
const AREA_ONLY: ParsedQuery = { ...EMPTY_QUERY, city: "Delhi", area: "Pitampura", intent: "search" };

function evaluated(studio: SearchCandidate, distanceKm: number | null, options: { excludedBy?: Evaluated["excludedBy"]; fit?: number } = {}): Evaluated {
    const facts: ResultFacts = {
        match: { setId: null, setName: null, matchedNeeds: [], missingNeeds: [], matchedVibes: [], matchedVenues: [], shootTypeFit: null, coverage: 0 },
        offer: buildOffer(studio, AREA_ONLY, null),
        availability: { checked: false, freeDates: [], busyDates: [], windows: [], suggestedStart: null },
        distanceKm,
        overBudgetBy: null,
        crewFits: null,
    };
    return { candidate: studio, facts, score: options.fit ?? fitScore(AREA_ONLY, facts, null), excludedBy: options.excludedBy ?? null };
}

const CURATED = { listingType: "CURATED" as const, price: null, priceRangeMin: 3000, priceRangeMax: 4000 };
const TOP_RATED = { avgReviewRating: 4.9, reviewCount: 40, imageSrc: Array.from({ length: 20 }, (_, index) => `${index}.jpg`) };

// The studios from a real "Pitampura" search, with their real distances from Pitampura.
const OMNISET = evaluated(candidate({ id: "omniset", ...CURATED }), 0.8);
const EDITORIAL = evaluated(candidate({ id: "editorial" }), 3.8);
const ROHINI = evaluated(candidate({ id: "rohini" }), 7.0);
const EAST_DELHI = evaluated(candidate({ id: "east-delhi", instantBooking: true }), 15.9);
const SOUTH_DELHI = evaluated(candidate({ id: "south-delhi", instantBooking: true }), 22.9);

const ids = (list: Evaluated[]) => list.map((entry) => entry.candidate.id);
const order = (...entries: Evaluated[]) => ids(selectResults(entries).eligible);

describe("selectResults", () => {
    it("orders a place-only search nearest first, so a curated studio 0.8 km away beats a verified one at 3.8 km", () => {
        expect(order(SOUTH_DELHI, EAST_DELHI, ROHINI, OMNISET, EDITORIAL))
            .toEqual(["omniset", "editorial", "rohini", "east-delhi", "south-delhi"]);
    });

    it("never lets a top-rated studio farther away beat an unrated nearer one", () => {
        // Under the old blended score, a 4.9★ studio with 40 reviews beat an unrated one 3 km away
        // from up to 9.4 km.
        const farAndLoved = evaluated(candidate({ id: "far-and-loved", ...TOP_RATED }), 9);
        const nearAndNew = evaluated(candidate({ id: "near-and-new" }), 3);

        expect(order(farAndLoved, nearAndNew)).toEqual(["near-and-new", "far-and-loved"]);
    });

    it("never lets instant booking move a studio ahead of a nearer one", () => {
        const instant = evaluated(candidate({ id: "instant", instantBooking: true }), 4.9);
        const plain = evaluated(candidate({ id: "plain" }), 4.0);

        expect(order(instant, plain)).toEqual(["plain", "instant"]);
    });

    it("ranks fit to the request above booking type and quality inside a 0.5 km step", () => {
        const fitsCurated = evaluated(candidate({ id: "fits-curated", ...CURATED }), 1.2, { fit: 0.9 });
        const partlyVerified = evaluated(candidate({ id: "partly-verified", ...TOP_RATED }), 1.1, { fit: 0.5 });

        expect(order(partlyVerified, fitsCurated)).toEqual(["fits-curated", "partly-verified"]);
    });

    it("puts studios that fit the request first, each group nearest first", () => {
        const nearMiss = evaluated(candidate({ id: "near-miss" }), 0.7, { fit: 0.2 });
        const farFit = evaluated(candidate({ id: "far-fit" }), 1.4, { fit: 0.9 });
        const nearerFit = evaluated(candidate({ id: "nearer-fit", ...CURATED }), 0.9, { fit: 0.6 });

        expect(order(nearMiss, farFit, nearerFit)).toEqual(["nearer-fit", "far-fit", "near-miss"]);
    });

    it("breaks ties inside a 0.5 km step on quality before exact distance", () => {
        const loved = evaluated(candidate({ id: "loved", ...TOP_RATED }), 1.4);
        const plain = evaluated(candidate({ id: "plain" }), 1.1);

        expect(order(plain, loved)).toEqual(["loved", "plain"]);
    });

    it("keeps excluded studios out of the list and offers verified ones as closest options", () => {
        const tooBig = evaluated(candidate({ id: "too-big", maximumPax: 3 }), 2, { excludedBy: "crew" });
        const curatedTooBig = evaluated(candidate({ id: "curated-too-big", ...CURATED, maximumPax: 3 }), 1, { excludedBy: "crew" });

        const { eligible, fallback } = selectResults([tooBig, curatedTooBig, ROHINI]);

        expect(ids(eligible)).toEqual(["rohini"]);
        expect(ids(fallback)).toEqual(["too-big"]);
    });
});
