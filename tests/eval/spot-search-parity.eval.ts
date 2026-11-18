import { describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
    unstable_cache: <T>(fn: T) => fn,
    revalidateTag: () => undefined,
    revalidatePath: () => undefined,
}));

import { type StudioSearchInput, toParsedQuery } from "@/lib/concierge/tools";
import type { AiSearchOutcome } from "@/lib/search/service";
import { resolveQuery, runAiSearch, type SearchContext, searchWithParsedQuery } from "@/lib/search/service";
import type { ParsedQuery } from "@/schemas/search";

const QUERIES = ["studio in pitampura", "podcast near sector 62 noida", "kolkata", "under 2000 in gurgaon", "for 10 people in delhi"];

const context = (): SearchContext => ({ now: new Date(), allowAi: false, visitor: null });

const resultIds = ({ view }: AiSearchOutcome) => (view.state === "results" ? view.results.map((result) => result.id) : [view.state]);

const orNothing = <T>(value: T | null) => value ?? undefined;

/** The fields Spot's model would send for this query, so the test exercises Spot's own mapping. */
const spotArgs = (parsed: ParsedQuery): StudioSearchInput => ({
    city: orNothing(parsed.city),
    area: orNothing(parsed.area),
    dates: parsed.dates,
    start_time: orNothing(parsed.startTime),
    hours: orNothing(parsed.hours),
    people: orNothing(parsed.crew),
    budget_min: orNothing(parsed.budgetMin),
    budget_max: orNothing(parsed.budgetMax),
    budget_per: parsed.budgetBasis === "hourly" ? "hour" : "shoot",
    shoot_types: parsed.shootTypes,
    needs: parsed.needs,
    looks: parsed.vibes,
    venue_types: parsed.venueTypes,
});

describe("Spot and the search box return the same studios", () => {
    it.each(QUERIES)("%s", async (query) => {
        const request = { query, overrides: {}, areaPoint: null };
        const resolved = await resolveQuery(request, context());
        expect(resolved).not.toBeNull();
        if (!resolved) return;

        const box = await runAiSearch(resolved, request, context());
        const { parsed } = toParsedQuery(spotArgs(resolved.parsed));
        const spot = await searchWithParsedQuery(parsed, query, context());

        expect(resultIds(spot)).toEqual(resultIds(box));
        expect(spot.view.state === "results" ? spot.view.notices : []).toEqual(box.view.state === "results" ? box.view.notices : []);
    }, 60_000);
});
