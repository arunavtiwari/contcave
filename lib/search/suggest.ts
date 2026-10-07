import "server-only";

import { unstable_cache } from "next/cache";

import { istDateKey } from "@/lib/booking/dayAvailability";
import { citySlug } from "@/lib/listing/cityPaths";
import { ListingService } from "@/lib/listing/service";
import prisma from "@/lib/prismadb";
import { SEARCH_CONFIG } from "@/lib/search/config";
import { queryChips } from "@/lib/search/explain";
import { prepareQueryText } from "@/lib/search/parse";
import { parseQueryRules } from "@/lib/search/parse/rules";
import { bm25Scores, rankByScore, reciprocalRankFusion, tokenize } from "@/lib/search/rank";
import type { StudioSuggestion, SuggestResult } from "@/lib/search/types";
import { expandCities, needSatisfiedBy, resolveCityName } from "@/lib/search/vocabulary";
import { normaliseUseCase } from "@/lib/taxonomy";
import { formatINR } from "@/lib/utils";
import type { ParsedQuery } from "@/schemas/search";

export type SuggestEntry = {
    id: string;
    slug: string | null;
    title: string;
    image: string | null;
    locationValue: string;
    category: string;
    venueTypes: string[];
    type: string[];
    tags: string[];
    price: number | null;
    curated: boolean;
    rating: number;
};

async function loadEntries(): Promise<SuggestEntry[]> {
    const ids = await ListingService.getHydratableListingIds({ active: true, status: "VERIFIED" });
    if (!ids.length) return [];
    const listings = await prisma.listing.findMany({
        where: { id: { in: ids } },
        select: {
            id: true,
            slug: true,
            title: true,
            imageSrc: true,
            locationValue: true,
            category: true,
            venueTypes: true,
            type: true,
            aesthetics: true,
            setFeatures: true,
            price: true,
            listingType: true,
            avgReviewRating: true,
            mediaPurgedAt: true,
            sets: { select: { aesthetics: true, setFeatures: true } },
        },
    });
    return listings
        .filter((listing) => !(listing.listingType === "CURATED" && listing.mediaPurgedAt))
        .map((listing) => {
            const type = listing.type.map(normaliseUseCase).filter((value): value is string => Boolean(value));
            const tags = Array.from(new Set([
                ...listing.aesthetics,
                ...listing.setFeatures,
                ...listing.sets.flatMap((set) => [...set.aesthetics, ...set.setFeatures]),
            ]));
            return {
                id: listing.id,
                slug: listing.slug,
                title: listing.title,
                image: listing.imageSrc[0] ?? null,
                locationValue: listing.locationValue,
                category: listing.category,
                venueTypes: listing.venueTypes,
                type,
                tags,
                price: listing.price,
                curated: listing.listingType === "CURATED",
                rating: listing.avgReviewRating ?? 0,
            };
        });
}

const loadSuggestIndex = unstable_cache(loadEntries, [SEARCH_CONFIG.cacheVersion, "suggest-index"], {
    revalidate: SEARCH_CONFIG.suggest.indexSeconds,
});

function withPrefixMatches(text: string, documents: string[]) {
    const last = tokenize(text).at(-1);
    if (!last) return text;
    const vocabulary = new Set(documents.flatMap(tokenize));
    const completions = Array.from(vocabulary)
        .filter((token) => token !== last && token.startsWith(last))
        .slice(0, SEARCH_CONFIG.suggest.prefixExpansions);
    return [text, ...completions].join(" ");
}

const searchableText = (entry: SuggestEntry) =>
    [entry.title, entry.category, ...entry.venueTypes, ...entry.type, ...entry.tags].join(" ");

function tagCoverage(parsed: ParsedQuery, entry: SuggestEntry) {
    const tags = new Set(entry.tags);
    const wanted = parsed.needs.length + parsed.vibes.length + parsed.shootTypes.length + parsed.venueTypes.length;
    if (!wanted) return 0;
    const gained = parsed.needs.filter((need) => needSatisfiedBy(need, tags)).length
        + parsed.vibes.filter((vibe) => tags.has(vibe)).length
        + parsed.shootTypes.filter((type) => entry.type.includes(type)).length
        + parsed.venueTypes.filter((venue) => entry.venueTypes.includes(venue)).length;
    return gained / wanted;
}

export function rankSuggestions(entries: SuggestEntry[], text: string, parsed: ParsedQuery): SuggestEntry[] {
    const cityName = parsed.city ? resolveCityName(parsed.city) ?? parsed.city : null;
    const cities = cityName ? new Set(expandCities(cityName).map(citySlug)) : null;
    const pool = cities ? entries.filter((entry) => cities.has(citySlug(entry.locationValue))) : entries;

    const documents = new Map(pool.map((entry) => [entry.id, searchableText(entry)]));
    const keyword = rankByScore(bm25Scores(withPrefixMatches(text, Array.from(documents.values())), documents));
    const tags = rankByScore(new Map(pool.map((entry) => [entry.id, tagCoverage(parsed, entry)])));
    const fused = reciprocalRankFusion([keyword, tags], SEARCH_CONFIG.rrfK);
    const matches = fused.size ? pool.filter((entry) => fused.has(entry.id)) : cities ? pool : [];

    return matches
        .sort((a, b) => (fused.get(b.id) ?? 0) - (fused.get(a.id) ?? 0) || b.rating - a.rating)
        .slice(0, SEARCH_CONFIG.suggest.limit);
}

const toSuggestion = (entry: SuggestEntry): StudioSuggestion => ({
    id: entry.id,
    title: entry.title,
    href: `/studio/${entry.slug || entry.id}`,
    image: entry.image,
    subtitle: [entry.locationValue, entry.venueTypes[0] ?? entry.category].filter(Boolean).join(" · "),
    price: entry.curated ? "Enquire" : entry.price ? `${formatINR(entry.price)} / hr` : null,
    curated: entry.curated,
});

export async function suggestStudios(query: string, now: Date): Promise<SuggestResult> {
    const text = prepareQueryText(query);
    const parsed = parseQueryRules(text, istDateKey(now));
    if (parsed.intent === "other") return { understood: [], studios: [] };
    return {
        understood: queryChips(parsed).flatMap((chip) => (chip.value ? [chip.value] : [])),
        studios: rankSuggestions(await loadSuggestIndex(), text, parsed).map(toSuggestion),
    };
}
