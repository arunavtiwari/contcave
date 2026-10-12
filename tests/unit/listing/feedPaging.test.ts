import { describe, expect, it } from "vitest";

import { parseFeedSort } from "@/lib/listing/feedSort";
import { pageFromParams, pagePath, pageTitle, paginationRange } from "@/lib/pagination";
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

    it("shows every page when there are few and windows the rest", () => {
        expect(paginationRange(1, 1)).toEqual([1]);
        expect(paginationRange(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
        expect(paginationRange(1, 20)).toEqual([1, 2, null, 20]);
        expect(paginationRange(3, 20)).toEqual([1, 2, 3, 4, null, 20]);
        expect(paginationRange(10, 20)).toEqual([1, null, 9, 10, 11, null, 20]);
        expect(paginationRange(20, 20)).toEqual([1, null, 19, 20]);
    });
});

describe("feed sort", () => {
    it("accepts only the price sorts", () => {
        expect(parseFeedSort("price_asc")).toBe("price_asc");
        expect(parseFeedSort("price_desc")).toBe("price_desc");
        expect(parseFeedSort("newest")).toBeUndefined();
        expect(parseFeedSort(null)).toBeUndefined();
    });

    it("parses the sort search param and ignores unknown values", () => {
        expect(studioFeedSearchParamsSchema.parse({ sort: "price_desc" }).sort).toBe("price_desc");
        expect(studioFeedSearchParamsSchema.parse({ sort: "rating" }).sort).toBeUndefined();
        expect(studioFeedSearchParamsSchema.parse({ page: "2" })).not.toHaveProperty("page");
    });
});
