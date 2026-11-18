import { describe, expect, it } from "vitest";

import { appendUnique, feedRequestPath, landingOf, pageAtLine } from "@/lib/listing/feedRequest";
import { searchParamsOf } from "@/lib/pagination";

describe("feedRequestPath", () => {
    it("asks for a page with the visitor's filters", () => {
        expect(feedRequestPath(2, { sort: "price_asc", page: "5" })).toBe("/api/listings/feed?sort=price_asc&page=2");
    });

    it("names the landing page so the server applies its place and category", () => {
        expect(feedRequestPath(3, {}, { place: "delhi", category: "podcast-studios" }))
            .toBe("/api/listings/feed?landing=delhi&landingCategory=podcast-studios&page=3");
        expect(feedRequestPath(3, {}, { place: "delhi", category: null })).toBe("/api/listings/feed?landing=delhi&page=3");
    });

    it("round-trips through the route's parser", () => {
        const href = feedRequestPath(2, { type: ["photo", "video"] }, { place: "delhi", category: "podcast-studios" });
        const params = searchParamsOf(new URL(href, "https://contcave.com").searchParams);
        expect(params.type).toEqual(["photo", "video"]);
        expect(landingOf(params)).toEqual({ place: "delhi", category: "podcast-studios" });
    });
});

describe("landingOf", () => {
    it("is null on the studios page", () => {
        expect(landingOf({ sort: "rating" })).toBeNull();
        expect(landingOf({ landing: "" })).toBeNull();
        expect(landingOf({ landing: ["a", "b"] })).toBeNull();
    });
});

describe("appendUnique", () => {
    it("adds the next page without repeating studios already shown", () => {
        const shown = [{ id: "a" }, { id: "b" }];
        expect(appendUnique(shown, [{ id: "b" }, { id: "c" }])).toEqual([{ id: "a" }, { id: "b" }, { id: "c" }]);
    });
});

describe("pageAtLine", () => {
    const starts = [
        { page: 1, top: -2000 },
        { page: 2, top: -100 },
        { page: 3, top: 900 },
    ];

    it("is the last page whose first card has passed the line", () => {
        expect(pageAtLine(starts, 400)).toBe(2);
        expect(pageAtLine(starts, 1000)).toBe(3);
    });

    it("falls back to the first loaded page before any card passes", () => {
        expect(pageAtLine([{ page: 4, top: 600 }], 400)).toBe(4);
        expect(pageAtLine([], 400)).toBeNull();
    });
});
