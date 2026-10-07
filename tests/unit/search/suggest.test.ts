import { describe, expect, it } from "vitest";

import { prepareQueryText } from "@/lib/search/parse";
import { parseQueryRules } from "@/lib/search/parse/rules";
import { rankSuggestions, type SuggestEntry } from "@/lib/search/suggest";

const TODAY = "2026-10-06";

const entry = (overrides: Partial<SuggestEntry>): SuggestEntry => ({
    id: "x",
    slug: null,
    title: "Studio",
    image: null,
    locationValue: "Lucknow",
    category: "Shoot Studio",
    venueTypes: [],
    type: [],
    tags: [],
    price: 1000,
    curated: false,
    rating: 0,
    ...overrides,
});

const ENTRIES = [
    entry({ id: "podcast", title: "Echo Podcast Room", venueTypes: ["Podcast Studio"], type: ["Podcast & Interview"], rating: 4.8 }),
    entry({ id: "cyc", title: "White Box Studio", tags: ["Infinity White Cyc", "Natural Light"], type: ["Product & E-commerce"] }),
    entry({ id: "delhi", title: "Delhi Podcast Hub", locationValue: "Delhi", type: ["Podcast & Interview"] }),
];

const rank = (query: string) => {
    const text = prepareQueryText(query);
    return rankSuggestions(ENTRIES, text, parseQueryRules(text, TODAY)).map((item) => item.id);
};

describe("rankSuggestions", () => {
    it("matches partly typed words", () => {
        expect(rank("echo pod")[0]).toBe("podcast");
    });

    it("keeps to the city in the query", () => {
        expect(rank("podcast studio in lucknow")).toEqual(["podcast"]);
        expect(rank("podcast delhi")).toEqual(["delhi"]);
    });

    it("ranks studios by the features asked for", () => {
        expect(rank("white cyc with natural light in lucknow")[0]).toBe("cyc");
    });

    it("lists a city's studios when only the city is typed", () => {
        expect(rank("lucknow")).toEqual(["podcast", "cyc"]);
    });

    it("returns nothing for text that matches no studio", () => {
        expect(rank("zzzz")).toEqual([]);
    });
});
