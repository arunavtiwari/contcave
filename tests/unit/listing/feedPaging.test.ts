import { describe, expect, it } from "vitest";

import { parseBrowseSort } from "@/lib/listing/browseSort";
import { pageFromParams, pagePath, pageTitle, searchParamsOf } from "@/lib/pagination";
import { studioFeedSearchParamsSchema } from "@/schemas/listing";

describe("page numbers", () => {
    it("treats missing, invalid and out-of-range values as page 1", () => {
        for (const value of [undefined, "", "0", "1", "-2", "2.5", "abc", "501"]) {
            expect(pageFromParams({ page: value }), String(value)).toBe(1);
        }
        expect(pageFromParams({ page: "3", sort: "price_asc" })).toBe(3);
        expect(pageFromParams({ page: ["4", "9"] })).toBe(4);
    });

    it("builds page URLs that keep other params and drop page 1", () => {
        expect(pagePath("/studios/delhi", 1)).toBe("/studios/delhi");
        expect(pagePath("/studios/delhi", 2)).toBe("/studios/delhi?page=2");
        expect(pagePath("/studios", 3, { type: "Video & Film", page: "2", sort: "price_asc" }))
            .toBe("/studios?type=Video+%26+Film&sort=price_asc&page=3");
        expect(pagePath("/studios", 1, { setFeatures: ["Cyclorama", "Green Screen"] }))
            .toBe("/studios?setFeatures=Cyclorama&setFeatures=Green+Screen");
    });

    it("titles later pages", () => {
        expect(pageTitle(["Book Studios in Delhi"], 1)).toBe("Book Studios in Delhi");
        expect(pageTitle(["Book Studios in Delhi"], 2)).toBe("Book Studios in Delhi – Page 2");
    });

    it("falls back to a shorter title when the page suffix pushes it past the limit", () => {
        const long = "Book Studios on Rent in Delhi NCR from ₹1,000/hr";
        expect(pageTitle([long, "Book Studios in Delhi NCR"], 1)).toBe(long);
        expect(pageTitle([long, "Book Studios in Delhi NCR"], 2)).toBe("Book Studios in Delhi NCR – Page 2");
    });

});

describe("feed sort", () => {
    it("accepts every browse order and falls back to recommended", () => {
        for (const order of ["recommended", "distance", "price_asc", "price_desc", "rating"]) {
            expect(parseBrowseSort(order)).toBe(order);
        }
        expect(parseBrowseSort(["price_desc", "rating"])).toBe("price_desc");
        expect(parseBrowseSort("newest")).toBe("recommended");
        expect(parseBrowseSort(null)).toBe("recommended");
    });

    it("keeps sort and page out of the feed filters", () => {
        const filters = studioFeedSearchParamsSchema.parse({ sort: "price_desc", page: "2" });
        expect(filters).not.toHaveProperty("sort");
        expect(filters).not.toHaveProperty("page");
    });
});

describe("searchParamsOf", () => {
    it("keeps repeated keys as arrays and single keys as strings", () => {
        expect(searchParamsOf(new URLSearchParams("a=1&b=2&b=3"))).toEqual({ a: "1", b: ["2", "3"] });
    });
});
