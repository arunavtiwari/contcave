import { needSatisfiedBy, SHOOT_TYPE_VENUES } from "@/lib/search/vocabulary";
import type { ParsedQuery } from "@/schemas/search";

import type { CandidateSet, MatchFacts, SearchCandidate } from "./types";

const VIBE_WEIGHT = 0.5;
const VENUE_WEIGHT = 0.5;
const SHOOT_TYPE_FIT = { exact: 1, compatibleVenue: 0.6, untagged: 0.4, mismatch: 0 } as const;

type SetMatch = { set: CandidateSet | null; matchedNeeds: string[]; matchedVibes: string[]; weight: number };

function matchTags(parsed: ParsedQuery, features: Set<string>, vibes: Set<string>, set: CandidateSet | null): SetMatch {
    const matchedNeeds = parsed.needs.filter((need) => needSatisfiedBy(need, features));
    const matchedVibes = parsed.vibes.filter((vibe) => vibes.has(vibe));
    return { set, matchedNeeds, matchedVibes, weight: matchedNeeds.length + matchedVibes.length * VIBE_WEIGHT };
}

const bySetPreference = (a: SetMatch, b: SetMatch) =>
    b.weight - a.weight || (a.set?.price ?? 0) - (b.set?.price ?? 0) || (a.set?.position ?? 0) - (b.set?.position ?? 0);

function shootTypeFit(parsed: ParsedQuery, candidate: SearchCandidate) {
    if (!parsed.shootTypes.length) return null;
    if (parsed.shootTypes.some((type) => candidate.type.includes(type))) return SHOOT_TYPE_FIT.exact;
    const compatible = parsed.shootTypes.flatMap((type) => SHOOT_TYPE_VENUES[type] ?? []);
    if (compatible.some((venue) => candidate.venueTypes.includes(venue))) return SHOOT_TYPE_FIT.compatibleVenue;
    return candidate.type.length ? SHOOT_TYPE_FIT.mismatch : SHOOT_TYPE_FIT.untagged;
}

export function matchCandidate(candidate: SearchCandidate, parsed: ParsedQuery): MatchFacts {
    const listingFeatures = [...candidate.setFeatures, ...candidate.facilities];
    const setMatches = candidate.hasSets && candidate.sets.length
        ? candidate.sets.map((set) => matchTags(
            parsed,
            new Set([...listingFeatures, ...set.setFeatures]),
            new Set([...candidate.aesthetics, ...set.aesthetics]),
            set,
        ))
        : [matchTags(parsed, new Set(listingFeatures), new Set(candidate.aesthetics), null)];
    const best = [...setMatches].sort(bySetPreference)[0];

    const matchedVenues = parsed.venueTypes.filter((venue) => candidate.venueTypes.includes(venue));
    const wanted = parsed.needs.length + (parsed.vibes.length * VIBE_WEIGHT) + (parsed.venueTypes.length * VENUE_WEIGHT);
    const gained = best.weight + matchedVenues.length * VENUE_WEIGHT;

    return {
        setId: best.set?.id ?? null,
        setName: best.set?.name ?? null,
        matchedNeeds: best.matchedNeeds,
        missingNeeds: parsed.needs.filter((need) => !best.matchedNeeds.includes(need)),
        matchedVibes: best.matchedVibes,
        matchedVenues,
        shootTypeFit: shootTypeFit(parsed, candidate),
        coverage: wanted > 0 ? gained / wanted : 0,
    };
}
