import type { LatLng } from "@/lib/geo";
import type { ParsedQuery } from "@/schemas/search";
import type { Package } from "@/types/package";
import type { AdditionalSetPricingType } from "@/types/set";

export type CandidateSet = {
    id: string;
    name: string;
    price: number;
    position: number;
    aesthetics: string[];
    setFeatures: string[];
};

export type SearchCandidate = {
    id: string;
    slug: string | null;
    title: string;
    imageSrc: string[];
    locationValue: string;
    listingType: "STANDARD" | "CURATED";
    category: string;
    price: number | null;
    hasSets: boolean;
    additionalSetPricingType: AdditionalSetPricingType | null;
    sets: CandidateSet[];
    packages: Package[];
    type: string[];
    venueTypes: string[];
    aesthetics: string[];
    setFeatures: string[];
    facilities: string[];
    maximumPax: number | null;
    minimumBookingHours: number | null;
    instantBooking: boolean;
    avgReviewRating: number | null;
    reviewCount: number;
    carpetArea: number | null;
    point: LatLng | null;
    priceRangeMin: number | null;
    priceRangeMax: number | null;
};

export type MatchFacts = {
    setId: string | null;
    setName: string | null;
    matchedNeeds: string[];
    missingNeeds: string[];
    matchedVibes: string[];
    matchedVenues: string[];
    shootTypeFit: number | null;
    coverage: number;
};

export type Offer = {
    hours: number;
    requestedHours: number | null;
    minimumHours: number;
    total: number | null;
    perHour: number | null;
    packageTitle: string | null;
    packageTotal: number | null;
};

export type DayWindow = { start: number; end: number };

export type AvailabilityFacts = {
    checked: boolean;
    freeDates: string[];
    busyDates: string[];
    windows: DayWindow[];
    suggestedStart: number | null;
};

export type ResultFacts = {
    match: MatchFacts;
    offer: Offer;
    availability: AvailabilityFacts;
    distanceKm: number | null;
    overBudgetBy: number | null;
    crewFits: boolean | null;
};

export type ScoredCandidate = {
    candidate: SearchCandidate;
    facts: ResultFacts;
    score: number;
};

export type ResultView = {
    id: string;
    title: string;
    image: string | null;
    location: string;
    href: string;
    rating: number | null;
    reviewCount: number;
    setName: string | null;
    estimate: string | null;
    packageNote: string | null;
    availability: string;
    reasons: string[];
    caveats: string[];
    fallback: boolean;
};

type ViewCommon = { parsed: ParsedQuery; source: "ai" | "rules" };

export type SearchView =
    | (ViewCommon & { state: "help" })
    | (ViewCommon & { state: "needCity"; cityOptions: string[]; suggestedCity: string | null })
    | (ViewCommon & { state: "notCovered"; city: string; cityOptions: string[] })
    | (ViewCommon & {
        state: "results";
        cityLabel: string;
        nearby: boolean;
        cityOptions: string[];
        results: ResultView[];
        curated: ResultView[];
        offerHandoff: boolean;
        notices: string[];
    });

export type SearchStreamEvent =
    | { type: "view"; view: SearchView; sessionToken: string }
    | { type: "reasons"; reasons: Record<string, string[]> };

export type StudioSuggestion = {
    id: string;
    title: string;
    href: string;
    image: string | null;
    subtitle: string;
    price: string | null;
    curated: boolean;
};

export type SuggestResult = { understood: string[]; studios: StudioSuggestion[] };
