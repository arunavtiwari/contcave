import { minimumBookingMinutes } from "@/lib/booking/dayAvailability";
import { quoteBooking, validateSetSelection } from "@/lib/pricing";
import type { ParsedQuery } from "@/schemas/search";
import type { ListingSet } from "@/types/set";

import type { Offer, SearchCandidate } from "./types";

const pricingInput = (candidate: SearchCandidate, hours: number, setId: string | null) => ({
    baseHourlyRate: candidate.price ?? 0,
    durationMinutes: Math.round(hours * 60),
    selectedSetIds: setId ? [setId] : [],
    sets: candidate.sets as unknown as ListingSet[],
    pricingType: candidate.additionalSetPricingType,
});

function bookingHours(candidate: SearchCandidate, parsed: ParsedQuery) {
    const minimumHours = minimumBookingMinutes(candidate.minimumBookingHours) / 60;
    return { minimumHours, hours: Math.max(parsed.hours ?? minimumHours, minimumHours) };
}

function curatedOffer(candidate: SearchCandidate, parsed: ParsedQuery, hours: number, minimumHours: number): Offer {
    const bounds = [candidate.priceRangeMin, candidate.priceRangeMax].filter((value): value is number => typeof value === "number" && value > 0);
    const perHour = bounds.length ? Math.round(bounds.reduce((sum, value) => sum + value, 0) / bounds.length) : null;
    return {
        hours,
        requestedHours: parsed.hours,
        minimumHours,
        total: perHour === null ? null : Math.round(perHour * hours),
        perHour,
        packageTitle: null,
        packageTotal: null,
    };
}

export function buildOffer(candidate: SearchCandidate, parsed: ParsedQuery, setId: string | null): Offer {
    const { hours, minimumHours } = bookingHours(candidate, parsed);
    if (candidate.listingType === "CURATED") return curatedOffer(candidate, parsed, hours, minimumHours);

    const priced = candidate.hasSets ? Boolean(setId) : candidate.price !== null && candidate.price > 0;
    const quote = priced ? quoteBooking({ ...pricingInput(candidate, hours, setId), selectedPackage: null }) : null;

    const selection = setId ? [setId] : [];
    const packageQuote = candidate.packages
        .filter((pkg) => pkg.isActive !== false && Number(pkg.durationHours) === hours)
        .filter((pkg) => !candidate.hasSets || validateSetSelection(selection, pkg).valid)
        .map((pkg) => ({ pkg, quote: quoteBooking({ ...pricingInput(candidate, hours, setId), selectedPackage: pkg }) }))
        .filter((option) => !quote || option.quote.total < quote.total)
        .sort((a, b) => a.quote.total - b.quote.total)[0];

    return {
        hours,
        requestedHours: parsed.hours,
        minimumHours,
        total: quote?.total ?? null,
        perHour: quote ? Math.round(quote.total / hours) : null,
        packageTitle: packageQuote?.pkg.title ?? null,
        packageTotal: packageQuote?.quote.total ?? null,
    };
}
