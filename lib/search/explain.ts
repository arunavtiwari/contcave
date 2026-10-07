import { minutesToLabel } from "@/lib/booking/dayAvailability";
import { labelToMinutes } from "@/lib/scheduling";
import { SEARCH_CONFIG } from "@/lib/search/config";
import { AESTHETIC_LABELS } from "@/lib/taxonomy";
import { formatINR, formatISTDate } from "@/lib/utils";
import { NEED_LABELS,type ParsedQuery, QUERY_FIELDS, type QueryField } from "@/schemas/search";

import type { AvailabilityFacts, ResultFacts, SearchCandidate } from "./types";

const MAX_REASONS = 3;
const MAX_MISSING_CAVEATS = 2;
const HIGH_RATING = 4.5;
const MIN_REVIEWS_FOR_PRAISE = 3;

export const formatDateKey = (dateKey: string) =>
    formatISTDate(`${dateKey}T12:00:00+05:30`, { weekday: "short", day: "numeric", month: "short" });

const formatDateList = (dateKeys: string[]) => dateKeys.map(formatDateKey).join(", ");

const formatKm = (km: number) => (km < 10 ? km.toFixed(1) : String(Math.round(km)));

const formatHours = (hours: number) => `${Number.isInteger(hours) ? hours : hours.toFixed(1)} hrs`;

export function templateReasons(candidate: SearchCandidate, parsed: ParsedQuery, facts: ResultFacts): string[] {
    const { match, distanceKm, overBudgetBy, crewFits } = facts;
    const reasons: string[] = [];

    match.matchedNeeds.forEach((need, index) => {
        reasons.push(index === 0 && match.setName ? `${need} in ${match.setName}` : need);
    });
    if (match.shootTypeFit === 1 && parsed.shootTypes[0]) reasons.push(`Listed for ${parsed.shootTypes[0]}`);
    if (crewFits && parsed.crew) reasons.push(`Fits ${parsed.crew}`);
    if (parsed.area && distanceKm !== null && distanceKm <= SEARCH_CONFIG.areaCaveatKm) {
        reasons.push(`${formatKm(distanceKm)} km from ${parsed.area}`);
    }
    if (overBudgetBy === 0) reasons.push("Within budget");
    match.matchedVibes.forEach((vibe) => reasons.push(`${vibe} look`));
    if ((candidate.avgReviewRating ?? 0) >= HIGH_RATING && candidate.reviewCount >= MIN_REVIEWS_FOR_PRAISE) {
        reasons.push(`Rated ${candidate.avgReviewRating!.toFixed(1)} by ${candidate.reviewCount} guests`);
    }
    return reasons.slice(0, MAX_REASONS);
}

export function caveats(candidate: SearchCandidate, parsed: ParsedQuery, facts: ResultFacts): string[] {
    const { match, offer, availability, distanceKm, overBudgetBy, crewFits } = facts;
    const notes: string[] = [];

    if (overBudgetBy) notes.push(`${formatINR(overBudgetBy)} over budget`);
    if (parsed.area && distanceKm !== null && distanceKm > SEARCH_CONFIG.areaCaveatKm) {
        notes.push(`${formatKm(distanceKm)} km from ${parsed.area}`);
    }
    if (offer.requestedHours !== null && offer.minimumHours > offer.requestedHours) {
        notes.push(`Minimum ${formatHours(offer.minimumHours)}`);
    }
    match.missingNeeds.slice(0, MAX_MISSING_CAVEATS).forEach((need) => notes.push(`No ${need} listed`));
    if (parsed.crew && crewFits === null) notes.push("Capacity not listed");
    if (crewFits === false && candidate.maximumPax) notes.push(`Fits up to ${candidate.maximumPax}`);
    if (offer.total === null) notes.push("Price on request");
    if (availability.checked && availability.freeDates.length && availability.busyDates.length) {
        notes.push(`Not free on ${formatDateList(availability.busyDates)}`);
    }
    return notes;
}

export function availabilityLabel(availability: AvailabilityFacts): string {
    if (!availability.checked) return "";
    if (!availability.freeDates.length) return `Not free on ${formatDateList(availability.busyDates)}`;
    if (availability.freeDates.length > 1 || !availability.windows.length) {
        return `Likely free ${formatDateList(availability.freeDates)}`;
    }
    const [window] = availability.windows;
    return `Likely free ${minutesToLabel(window.start)} – ${minutesToLabel(window.end)}`;
}

export function offerLabel(facts: ResultFacts): string | null {
    const { offer } = facts;
    if (offer.total === null) return null;
    return `${formatINR(offer.total)} for ${formatHours(offer.hours)} incl. GST`;
}

const KNOWN_LABELS = [...NEED_LABELS, ...AESTHETIC_LABELS];

function allowedNumbers(candidate: SearchCandidate, parsed: ParsedQuery, facts: ResultFacts) {
    const values = [
        parsed.crew,
        parsed.hours,
        candidate.maximumPax,
        candidate.reviewCount,
        candidate.avgReviewRating?.toFixed(1),
        facts.distanceKm === null ? null : formatKm(facts.distanceKm),
        facts.offer.total,
        facts.offer.hours,
        facts.overBudgetBy,
        candidate.carpetArea,
    ];
    return new Set(values.filter((value) => value !== null && value !== undefined).map((value) => String(value)));
}

export function isGroundedReason(reason: string, candidate: SearchCandidate, parsed: ParsedQuery, facts: ResultFacts) {
    const numbers = reason.replace(/(?<=\d),(?=\d)/g, "").match(/\d+(?:\.\d+)?/g) ?? [];
    const allowed = allowedNumbers(candidate, parsed, facts);
    if (numbers.some((number) => !allowed.has(number))) return false;
    const granted = new Set([...facts.match.matchedNeeds, ...facts.match.matchedVibes]);
    const lowered = reason.toLowerCase();
    return KNOWN_LABELS.every((label) => granted.has(label) || !lowered.includes(label.toLowerCase()));
}

export type QueryChip = { field: QueryField; label: string; value: string | null; inferred: boolean };

const joinLabels = (labels: string[]) => (labels.length ? labels.join(", ") : null);

function budgetValue(parsed: ParsedQuery) {
    const { budgetMin: min, budgetMax: max } = parsed;
    if (min === null && max === null) return null;
    const range = min !== null && max !== null && min !== max
        ? `${formatINR(min)} – ${formatINR(max)}`
        : max !== null ? `Up to ${formatINR(max)}` : `From ${formatINR(min!)}`;
    return parsed.budgetBasis === "hourly" ? `${range} / hr` : range;
}

export function queryChips(parsed: ParsedQuery): QueryChip[] {
    const values: Record<QueryField, [string, string | null]> = {
        city: ["City", parsed.city],
        area: ["Area", parsed.area],
        dates: ["Date", parsed.dates.length ? formatDateList(parsed.dates) : parsed.datesFlexible ? "Flexible" : null],
        startTime: ["Start", parsed.startTime ? minutesToLabel(labelToMinutes(parsed.startTime)) : null],
        hours: ["Hours", parsed.hours ? formatHours(parsed.hours) : null],
        crew: ["Crew", parsed.crew ? `${parsed.crew} people` : null],
        budget: ["Budget", budgetValue(parsed)],
        shootTypes: ["Shoot type", joinLabels(parsed.shootTypes)],
        needs: ["Must-haves", joinLabels(parsed.needs)],
        vibes: ["Look", joinLabels(parsed.vibes)],
        venueTypes: ["Space", joinLabels(parsed.venueTypes)],
    };
    return QUERY_FIELDS.map((field) => ({
        field,
        label: values[field][0],
        value: values[field][1],
        inferred: parsed.inferred.includes(field),
    }));
}

export const querySummary = (parsed: ParsedQuery) =>
    queryChips(parsed)
        .filter((chip) => chip.value)
        .map((chip) => `${chip.label}: ${chip.value}`)
        .join("\n");
