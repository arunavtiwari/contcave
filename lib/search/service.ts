import "server-only";

import { INDIAN_CITIES } from "@/hooks/useCities";
import { loadDayAvailabilities } from "@/lib/availability";
import { type DayAvailability, istDateKey, MINUTES_PER_DAY } from "@/lib/booking/dayAvailability";
import { distanceKm, type LatLng, type Nearby } from "@/lib/geo";
import { bookingPrefillQuery } from "@/lib/listing/bookingPrefill";
import { getCityDirectory } from "@/lib/listing/cities";
import { citySlug } from "@/lib/listing/cityPaths";
import { ListingService, type SearchCandidateRecord } from "@/lib/listing/service";
import { labelToMinutes } from "@/lib/scheduling";
import { summarizeAvailability } from "@/lib/search/availability";
import { SEARCH_CONFIG } from "@/lib/search/config";
import { availabilityLabel, caveats, offerLabel, templateReasons } from "@/lib/search/explain";
import { findLocality } from "@/lib/search/localities";
import { matchCandidate } from "@/lib/search/match";
import { buildOffer } from "@/lib/search/offer";
import { parseQuery, prepareQueryText } from "@/lib/search/parse";
import { bm25Scores, dotProduct, rankByScore, reciprocalRankFusion } from "@/lib/search/rank";
import { budgetTotal, overBudgetBy, scoreResult } from "@/lib/search/score";
import { embedQuery, loadSearchDocs, type SearchDoc } from "@/lib/search/searchDoc";
import type { ResultFacts, ResultView, ScoredCandidate, SearchCandidate, SearchView } from "@/lib/search/types";
import { expandCities, extractTerms, resolveCityName } from "@/lib/search/vocabulary";
import { normaliseUseCase } from "@/lib/taxonomy";
import { formatINR } from "@/lib/utils";
import { OVERRIDE_FIELD_MAP, type ParsedQuery, type QueryField, type QueryOverrides, type SearchRequest } from "@/schemas/search";

const NEARBY_CITY_KM = 150;
const NEARBY_FALLBACK_KM = 60;

export type ExplainableResult = ScoredCandidate & { id: string };

export type SessionRecord = {
    query: string;
    parsed: ParsedQuery;
    source: "ai" | "rules";
    overrides: QueryOverrides;
    results: { listingId: string; setId: string | null; score: number; rank: number }[];
    curated: string[];
    resultCount: number;
    goodCount: number;
    timings: Record<string, number>;
};

export type AiSearchOutcome = { view: SearchView; session: SessionRecord; explainable: ExplainableResult[] };

export type SearchContext = { now: Date; allowAi: boolean; visitor: Nearby | null };

type Evaluated = ScoredCandidate & { excludedBy: "crew" | "date" | "budget" | null };

const unique = <T>(values: T[]) => Array.from(new Set(values));

const pointOf = (record: SearchCandidateRecord): LatLng | null => {
    const coordinates = record.locationPoint?.coordinates;
    return coordinates?.length === 2 ? [coordinates[1], coordinates[0]] : null;
};

function toSearchCandidate(record: SearchCandidateRecord): SearchCandidate {
    return {
        id: record.id,
        slug: record.slug,
        title: record.title,
        imageSrc: record.imageSrc,
        locationValue: record.locationValue,
        listingType: record.listingType,
        category: record.category,
        price: record.price,
        hasSets: record.hasSets,
        additionalSetPricingType: record.additionalSetPricingType,
        sets: record.sets,
        packages: record.packages,
        type: record.type.map(normaliseUseCase).filter((type): type is string => Boolean(type)),
        venueTypes: record.venueTypes,
        aesthetics: record.aesthetics,
        setFeatures: record.setFeatures,
        facilities: unique([...record.amenityNames, ...record.otherAmenities].flatMap((name) => extractTerms(name).needs)),
        maximumPax: record.maximumPax,
        minimumBookingHours: record.minimumBookingHours,
        instantBooking: Boolean(record.instantBooking),
        avgReviewRating: record.avgReviewRating,
        reviewCount: record.reviewCount,
        carpetArea: record.carpetArea,
        point: pointOf(record),
        priceRangeMin: record.priceRangeMin,
        priceRangeMax: record.priceRangeMax,
    };
}

function applyOverrides(parsed: ParsedQuery, overrides: QueryOverrides): ParsedQuery {
    const keys = Object.keys(overrides) as (keyof QueryOverrides)[];
    if (!keys.length) return parsed;
    const overridden = new Set<QueryField>(keys.map((key) => OVERRIDE_FIELD_MAP[key]));
    return {
        ...parsed,
        ...overrides,
        intent: "search",
        datesFlexible: "dates" in overrides ? false : parsed.datesFlexible,
        inferred: parsed.inferred.filter((field) => !overridden.has(field)),
    };
}

function studioHref(candidate: SearchCandidate, parsed: ParsedQuery, facts: ResultFacts) {
    const base = `/studio/${candidate.slug || candidate.id}`;
    const date = facts.availability.freeDates[0] ?? parsed.dates[0];
    if (!date || candidate.listingType === "CURATED") return base;
    const requested = parsed.startTime ? labelToMinutes(parsed.startTime) : facts.availability.suggestedStart;
    const start = requested !== null && Number.isFinite(requested) ? requested : null;
    return `${base}?${bookingPrefillQuery({
        date,
        start,
        end: start === null ? null : Math.min(MINUTES_PER_DAY, start + facts.offer.hours * 60),
        setIds: facts.match.setId ? [facts.match.setId] : [],
    })}`;
}

function toView(result: ScoredCandidate, parsed: ParsedQuery, fallback: boolean): ResultView {
    const { candidate, facts } = result;
    const { packageTitle, packageTotal } = facts.offer;
    return {
        id: candidate.id,
        title: candidate.title,
        image: candidate.imageSrc[0] ?? null,
        location: candidate.locationValue,
        href: studioHref(candidate, parsed, facts),
        rating: candidate.reviewCount ? candidate.avgReviewRating : null,
        reviewCount: candidate.reviewCount,
        setName: facts.match.setName,
        estimate: offerLabel(facts),
        packageNote: packageTitle && packageTotal ? `${packageTitle} package · ${formatINR(packageTotal)} incl. GST` : null,
        availability: availabilityLabel(facts.availability),
        reasons: templateReasons(candidate, parsed, facts),
        caveats: caveats(candidate, parsed, facts),
        fallback,
    };
}

async function loadDays(listingIds: string[], dates: string[], now: Date) {
    const byListing = new Map<string, DayAvailability[]>();
    if (!listingIds.length || !dates.length) return byListing;
    const perDate = await Promise.all(dates.map((date) => loadDayAvailabilities({ listingIds, date, now })));
    for (const days of perDate) {
        for (const [listingId, day] of days) byListing.set(listingId, [...(byListing.get(listingId) ?? []), day]);
    }
    return byListing;
}

function featureScores(evaluated: Evaluated[], parsed: ParsedQuery, text: string, docs: Map<string, SearchDoc>, queryVector: Float32Array | null) {
    const wantsTags = parsed.needs.length + parsed.vibes.length + parsed.venueTypes.length > 0;
    const ids = evaluated.map(({ candidate }) => candidate.id);
    const tagList = wantsTags ? rankByScore(new Map(evaluated.map(({ candidate, facts }) => [candidate.id, facts.match.coverage]))) : [];
    const keywordList = rankByScore(bm25Scores(text, new Map(ids.flatMap((id) => {
        const doc = docs.get(id);
        return doc ? [[id, doc.text] as const] : [];
    }))));
    const semanticList = queryVector
        ? rankByScore(new Map(ids.flatMap((id) => {
            const vector = docs.get(id)?.vector;
            return vector ? [[id, dotProduct(queryVector, vector)] as const] : [];
        })))
        : [];
    const fused = reciprocalRankFusion([tagList, keywordList, semanticList], SEARCH_CONFIG.rrfK);
    return (id: string) => (fused.size ? fused.get(id) ?? 0 : null);
}

function evaluate(
    candidate: SearchCandidate,
    parsed: ParsedQuery,
    days: DayAvailability[],
    areaPoint: LatLng | null,
): Evaluated {
    const match = matchCandidate(candidate, parsed);
    const offer = buildOffer(candidate, parsed, match.setId);
    const availability = summarizeAvailability(days, {
        start: parsed.startTime ? labelToMinutes(parsed.startTime) : null,
        durationMinutes: offer.hours * 60,
        setIds: match.setId ? [match.setId] : [],
    });
    const over = overBudgetBy(parsed, offer);
    const crewFits = parsed.crew === null || !candidate.maximumPax ? null : candidate.maximumPax >= parsed.crew;
    const facts: ResultFacts = {
        match,
        offer,
        availability,
        distanceKm: areaPoint && candidate.point ? distanceKm(areaPoint, candidate.point) : null,
        overBudgetBy: over,
        crewFits,
    };
    const limit = budgetTotal(parsed, offer.hours);
    const excludedBy = crewFits === false
        ? "crew"
        : parsed.dates.length && candidate.listingType !== "CURATED" && !availability.freeDates.length
            ? "date"
            : limit && over && over > limit * SEARCH_CONFIG.budgetSoftOverRatio
                ? "budget"
                : null;
    return { candidate, facts, score: 0, excludedBy };
}

const byScore = (a: { score: number }, b: { score: number }) => b.score - a.score;

const FALLBACK_ORDER: Record<NonNullable<Evaluated["excludedBy"]>, (a: Evaluated, b: Evaluated) => number> = {
    budget: (a, b) => (a.facts.offer.total ?? Number.MAX_SAFE_INTEGER) - (b.facts.offer.total ?? Number.MAX_SAFE_INTEGER),
    crew: (a, b) => (b.candidate.maximumPax ?? 0) - (a.candidate.maximumPax ?? 0),
    date: byScore,
};

const fallbackOrder = (pool: Evaluated[]) =>
    [...pool].sort((a, b) => (a.excludedBy && a.excludedBy === b.excludedBy ? FALLBACK_ORDER[a.excludedBy](a, b) : byScore(a, b)));

function coveredCitiesNear(point: LatLng, covered: string[], maxKm: number) {
    return INDIAN_CITIES
        .filter((city) => covered.includes(city.name))
        .map((city) => ({ name: city.name, km: distanceKm(point, city.latlng as LatLng) }))
        .filter((city) => city.km <= maxKm)
        .sort((a, b) => a.km - b.km)
        .map((city) => city.name);
}

const nearestCoveredCity = (visitor: Nearby | null, covered: string[]) =>
    (visitor ? coveredCitiesNear(visitor.latlng, covered, NEARBY_CITY_KM)[0] ?? null : null);

function notices(parsed: ParsedQuery, cityLabel: string, areaPoint: LatLng | null, nearby: boolean) {
    const list: string[] = [];
    if (nearby) list.push(`We don't have studios in ${cityLabel} yet, so these are the closest ones nearby.`);
    if (parsed.area && !areaPoint) list.push(`We couldn't place "${parsed.area}" on the map, so these are from all of ${cityLabel}.`);
    if (!parsed.dates.length) list.push("Add a date to see live availability.");
    return list;
}

const sessionResults = (results: ScoredCandidate[]) =>
    results.map(({ candidate, facts, score }, index) => ({
        listingId: candidate.id,
        setId: facts.match.setId,
        score: Math.round(score * 1000) / 1000,
        rank: index + 1,
    }));

export type ResolvedQuery = {
    parsed: ParsedQuery;
    source: "ai" | "rules";
    text: string;
    queryVector: Float32Array | null;
    parseMs: number;
};

export async function resolveQuery(request: SearchRequest, context: SearchContext): Promise<ResolvedQuery | null> {
    if (!request.query && !Object.keys(request.overrides).length) return null;
    const startedAt = Date.now();
    const text = prepareQueryText(request.query);
    const [parsed, queryVector] = await Promise.all([
        parseQuery(text, { today: istDateKey(context.now), allowAi: context.allowAi }),
        embedQuery(text, context.allowAi),
    ]);
    return {
        parsed: applyOverrides(parsed.parsed, request.overrides),
        source: parsed.source,
        text,
        queryVector,
        parseMs: Date.now() - startedAt,
    };
}

export async function runAiSearch(
    resolved: ResolvedQuery,
    request: SearchRequest,
    context: SearchContext,
): Promise<AiSearchOutcome> {
    const startedAt = Date.now();
    const { parsed, text, queryVector } = resolved;
    const session = (extra: Partial<SessionRecord> = {}): SessionRecord => ({
        query: text,
        parsed,
        source: resolved.source,
        overrides: request.overrides,
        results: [],
        curated: [],
        resultCount: 0,
        goodCount: 0,
        timings: { parseMs: resolved.parseMs, searchMs: Date.now() - startedAt },
        ...extra,
    });
    const common = { parsed, source: resolved.source };
    const finish = (view: SearchView, extra: Partial<SessionRecord> = {}, explainable: ExplainableResult[] = []): AiSearchOutcome =>
        ({ view, session: session(extra), explainable });

    if (parsed.intent === "other") return finish({ ...common, state: "help" });

    const directory = await getCityDirectory();
    const cityOptions = directory.map((entry) => entry.city);
    const cityName = parsed.city ? resolveCityName(parsed.city) ?? parsed.city : null;
    if (!cityName) {
        return finish({ ...common, state: "needCity", cityOptions, suggestedCity: nearestCoveredCity(context.visitor, cityOptions) });
    }

    const cities = expandCities(cityName);
    const areaPoint = request.areaPoint ?? (parsed.area ? findLocality(parsed.area, cities)?.latlng ?? null : null);
    const cityCentre = INDIAN_CITIES.find((city) => city.name === cities[0])?.latlng as LatLng | undefined;
    const candidatesIn = (names: string[]) => ListingService.getSearchCandidates({
        locationValues: unique(names.flatMap((city) => directory.find((entry) => entry.slug === citySlug(city))?.locationValues ?? [city])),
        origin: areaPoint ?? cityCentre ?? null,
        limit: SEARCH_CONFIG.maxCandidates,
    });

    const local = await candidatesIn(cities);
    const nearbyCities = local.length || !cityCentre
        ? []
        : coveredCitiesNear(cityCentre, cityOptions, NEARBY_FALLBACK_KM).filter((name) => !cities.includes(name));
    const nearby = nearbyCities.length > 0;
    const records = nearby ? await candidatesIn(nearbyCities) : local;
    if (!records.length) return finish({ ...common, state: "notCovered", city: cityName, cityOptions });
    const referencePoint = areaPoint ?? (nearby ? cityCentre ?? null : null);

    const candidates = records.map(toSearchCandidate);
    const standardIds = candidates.filter((candidate) => candidate.listingType !== "CURATED").map((candidate) => candidate.id);
    const [days, docs] = await Promise.all([
        loadDays(standardIds, parsed.dates, context.now),
        loadSearchDocs(candidates.map((candidate) => candidate.id)),
    ]);

    const evaluated = candidates.map((candidate) => evaluate(candidate, parsed, days.get(candidate.id) ?? [], referencePoint));
    const feature = featureScores(evaluated, parsed, text, docs, queryVector);
    for (const entry of evaluated) entry.score = scoreResult(entry.candidate, parsed, entry.facts, feature(entry.candidate.id));

    const standard = evaluated.filter((entry) => entry.candidate.listingType !== "CURATED");
    const eligible = standard.filter((entry) => !entry.excludedBy).sort(byScore).slice(0, SEARCH_CONFIG.maxResults);
    const fallback = eligible.length < SEARCH_CONFIG.closestFallbackCount
        ? fallbackOrder(standard.filter((entry) => entry.excludedBy)).slice(0, SEARCH_CONFIG.closestFallbackCount - eligible.length)
        : [];
    const curated = evaluated
        .filter((entry) => entry.candidate.listingType === "CURATED" && entry.excludedBy !== "crew")
        .sort(byScore)
        .slice(0, SEARCH_CONFIG.maxCurated);

    const goodCount = eligible.filter((entry) => entry.score >= SEARCH_CONFIG.goodScore).length;
    const cityLabel = cityName;
    const shown = [...eligible, ...fallback];

    return finish(
        {
            ...common,
            state: "results",
            cityLabel,
            nearby,
            cityOptions,
            results: [...eligible.map((entry) => toView(entry, parsed, false)), ...fallback.map((entry) => toView(entry, parsed, true))],
            curated: curated.map((entry) => toView(entry, parsed, false)),
            offerHandoff: goodCount < SEARCH_CONFIG.minGoodResults,
            notices: notices(parsed, cityLabel, areaPoint, nearby),
        },
        {
            results: sessionResults(shown),
            curated: curated.map((entry) => entry.candidate.id),
            resultCount: shown.length,
            goodCount,
        },
        eligible.slice(0, SEARCH_CONFIG.ai.reasonsTopN).map((entry) => ({ ...entry, id: entry.candidate.id })),
    );
}
