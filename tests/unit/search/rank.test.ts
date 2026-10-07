import { describe, expect, it } from "vitest";

import { buildDayAvailability } from "@/lib/booking/dayAvailability";
import { addGst, calculateSetPricing, quoteBooking } from "@/lib/pricing";
import { freeWindows, summarizeAvailability } from "@/lib/search/availability";
import { availabilityLabel, caveats, isGroundedReason, templateReasons } from "@/lib/search/explain";
import { matchCandidate } from "@/lib/search/match";
import { buildOffer } from "@/lib/search/offer";
import { bm25Scores, rankByScore, reciprocalRankFusion } from "@/lib/search/rank";
import { bayesianRating, overBudgetBy, scoreResult } from "@/lib/search/score";
import type { ResultFacts, SearchCandidate } from "@/lib/search/types";
import { EMPTY_QUERY,type ParsedQuery } from "@/schemas/search";
import type { ListingSet } from "@/types/set";

const NOW = new Date("2026-10-06T04:30:00.000Z");

const candidate = (overrides: Partial<SearchCandidate> = {}): SearchCandidate => ({
    id: "a".repeat(24),
    slug: "studio",
    title: "Studio",
    imageSrc: [],
    locationValue: "Lucknow",
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

const parsed = (overrides: Partial<ParsedQuery> = {}): ParsedQuery => ({ ...EMPTY_QUERY, ...overrides });

const SETS = [
    { id: "s1", name: "Set A", price: 1000, position: 0, aesthetics: [], setFeatures: ["Natural Light"] },
    { id: "s2", name: "Set B", price: 1500, position: 1, aesthetics: ["Minimalist & White"], setFeatures: ["Infinity White Cyc", "Natural Light"] },
];

describe("quoteBooking", () => {
    const cases = [
        { baseHourlyRate: 1500, durationMinutes: 240, selectedSetIds: [], sets: [], pricingType: null },
        { baseHourlyRate: 0, durationMinutes: 240, selectedSetIds: ["s1", "s2"], sets: SETS, pricingType: "FIXED" as const },
        { baseHourlyRate: 0, durationMinutes: 150, selectedSetIds: ["s1", "s2"], sets: SETS, pricingType: "HOURLY" as const },
    ];

    it.each(cases)("matches calculateSetPricing + addGst", (input) => {
        const params = { ...input, sets: input.sets as unknown as ListingSet[] };
        const expected = addGst(calculateSetPricing(params).subtotal);
        expect(quoteBooking(params)).toMatchObject({ total: expected.total, gstAmount: expected.gstAmount });
    });

    it("prices packages as a flat amount", () => {
        const quote = quoteBooking({
            baseHourlyRate: 0, durationMinutes: 240, selectedSetIds: ["s1"], sets: SETS as unknown as ListingSet[], pricingType: null,
            selectedPackage: { id: "p", title: "Half day", originalPrice: 5000, offeredPrice: 4000, fixedAddOn: 500, features: [], durationHours: 4 },
        });
        expect(quote).toMatchObject({ subtotal: 4500, total: 5310, packageId: "p" });
    });
});

describe("matching and offers", () => {
    it("matches at set level and picks the set that fits", () => {
        const studio = candidate({ hasSets: true, sets: SETS, additionalSetPricingType: "FIXED" });
        const facts = matchCandidate(studio, parsed({ needs: ["Infinity White Cyc", "Natural Light"], vibes: ["Minimalist & White"] }));
        expect(facts).toMatchObject({ setId: "s2", setName: "Set B", missingNeeds: [], coverage: 1 });
    });

    it("treats any cyclorama as satisfying a cyc request", () => {
        const studio = candidate({ setFeatures: ["Infinity White Cyc"] });
        expect(matchCandidate(studio, parsed({ needs: ["Cyclorama"] })).matchedNeeds).toEqual(["Cyclorama"]);
    });

    it("prices at the minimum when fewer hours are requested", () => {
        const offer = buildOffer(candidate({ minimumBookingHours: 4 }), parsed({ hours: 2 }), null);
        expect(offer).toMatchObject({ hours: 4, minimumHours: 4, total: addGst(6000).total });
    });

    it("offers a cheaper package of the exact duration as an alternative", () => {
        const studio = candidate({
            hasSets: true,
            sets: SETS,
            packages: [{ id: "p", title: "Half day", originalPrice: 6000, offeredPrice: 3000, features: [], durationHours: 4, isActive: true }],
        });
        const offer = buildOffer(studio, parsed({ hours: 4 }), "s1");
        expect(offer).toMatchObject({ total: addGst(4000).total, packageTitle: "Half day", packageTotal: addGst(3000).total });
    });

    it("measures budget against the GST-inclusive total", () => {
        const offer = buildOffer(candidate(), parsed({ hours: 4, budgetMax: 7000 }), null);
        expect(overBudgetBy(parsed({ budgetMax: 7000 }), offer)).toBe(addGst(6000).total - 7000);
        expect(overBudgetBy(parsed({ budgetMax: 1700, budgetBasis: "hourly" }), offer)).toBe(addGst(6000).total - 6800);
        expect(overBudgetBy(parsed({ budgetMax: 1800, budgetBasis: "hourly" }), offer)).toBe(0);
    });
});

describe("availability", () => {
    const day = buildDayAvailability({
        date: "2026-10-10",
        listing: { operationalHours: { start: "9:00 AM", end: "9:00 PM" }, minimumBookingHours: 2, hasSets: false, setIds: [] },
        bookings: [{ startTime: "12:00 PM", endTime: "3:00 PM" }],
        blocks: [],
        now: NOW,
    });

    it("lists free windows long enough for the booking", () => {
        expect(freeWindows(day, 180, [])).toEqual([{ start: 540, end: 720 }, { start: 900, end: 1260 }]);
        expect(freeWindows(day, 240, [])).toEqual([{ start: 900, end: 1260 }]);
    });

    it("checks a requested start time", () => {
        expect(summarizeAvailability([day], { start: 540, durationMinutes: 180, setIds: [] }).freeDates).toEqual(["2026-10-10"]);
        expect(summarizeAvailability([day], { start: 660, durationMinutes: 180, setIds: [] }).busyDates).toEqual(["2026-10-10"]);
    });

    it("labels availability for the card", () => {
        const facts = summarizeAvailability([day], { start: null, durationMinutes: 240, setIds: [] });
        expect(availabilityLabel(facts)).toBe("Likely free 3:00 PM – 9:00 PM");
        expect(availabilityLabel(summarizeAvailability([], { start: null, durationMinutes: 60, setIds: [] }))).toBe("");
    });
});

describe("ranking", () => {
    it("fuses ranked lists with ties sharing a rank", () => {
        const fused = reciprocalRankFusion([[["a", "b"], ["c"]], [["c"], ["a"]]], 60);
        expect(fused.get("a")).toBeGreaterThan(fused.get("b")!);
        expect(fused.get("a")).toBeLessThanOrEqual(1);
        expect(reciprocalRankFusion([[], []], 60).size).toBe(0);
    });

    it("scores keyword relevance with BM25", () => {
        const scores = bm25Scores("makeup room near window", new Map([
            ["x", "Bright loft with a makeup room and big windows"],
            ["y", "Podcast booth with acoustic panels"],
        ]));
        expect(rankByScore(scores)).toEqual([["x"]]);
    });

    it("shrinks ratings with few reviews toward the prior", () => {
        expect(bayesianRating(5, 1)).toBeLessThan(bayesianRating(4.7, 40));
        expect(bayesianRating(null, 0)).toBeCloseTo(4.3);
    });

    it("renormalises when signals are missing and penalises missing must-haves", () => {
        const studio = candidate();
        const facts: ResultFacts = {
            match: { setId: null, setName: null, matchedNeeds: [], missingNeeds: [], matchedVibes: [], matchedVenues: [], shootTypeFit: null, coverage: 0 },
            offer: buildOffer(studio, parsed(), null),
            availability: { checked: false, freeDates: [], busyDates: [], windows: [], suggestedStart: null },
            distanceKm: null,
            overBudgetBy: null,
            crewFits: null,
        };
        const plain = scoreResult(studio, parsed(), facts, null);
        const missing = scoreResult(studio, parsed(), { ...facts, match: { ...facts.match, missingNeeds: ["Green Screen"] } }, null);
        expect(plain).toBeGreaterThan(0);
        expect(missing).toBeCloseTo(Math.max(0, plain - 0.1));
    });
});

describe("explanations", () => {
    const studio = candidate({ hasSets: true, sets: SETS, maximumPax: 8 });
    const request = parsed({ needs: ["Infinity White Cyc", "Green Screen"], crew: 6, budgetMax: 5000, hours: 4, area: "Gomti Nagar" });
    const match = matchCandidate(studio, request);
    const offer = buildOffer(studio, request, match.setId);
    const facts: ResultFacts = {
        match,
        offer,
        availability: { checked: false, freeDates: [], busyDates: [], windows: [], suggestedStart: null },
        distanceKm: 1.4,
        overBudgetBy: overBudgetBy(request, offer),
        crewFits: true,
    };

    it("builds reasons and caveats from facts only", () => {
        expect(templateReasons(studio, request, facts)).toEqual(["Infinity White Cyc in Set B", "Fits 6", "1.4 km from Gomti Nagar"]);
        expect(caveats(studio, request, facts)).toEqual(expect.arrayContaining(["No Green Screen listed", expect.stringMatching(/over budget$/)]));
    });

    it("rejects AI reasons with invented numbers or features", () => {
        expect(isGroundedReason("Fits 6 · 1.4 km away", studio, request, facts)).toBe(true);
        expect(isGroundedReason("Fits 12 people", studio, request, facts)).toBe(false);
        expect(isGroundedReason("Has a Green Screen", studio, request, facts)).toBe(false);
    });
});
