import { describe, expect, it } from "vitest";

import { pickRelated } from "@/lib/listing/related";
import { isStudioWrite } from "@/lib/listing/studioCacheInvalidation";

const studio = (id: string, locationValue: string, type: string[] = []) => ({
    id,
    locationValue,
    category: "Indoor Studio",
    type,
    venueTypes: [],
    setFeatures: [],
});

describe("pickRelated", () => {
    const subject = studio("me", "Delhi", ["podcast"]);

    it("never picks the studio itself and prefers the same city", () => {
        const published = [subject, studio("far", "Mumbai", ["podcast"]), studio("near", "Delhi")];
        expect(pickRelated(subject, published)).toEqual(["near", "far"]);
    });

    it("drops studios that share neither city nor category, and caps the list", () => {
        const published = [studio("none", "Pune"), ...Array.from({ length: 6 }, (_, index) => studio(`d${index}`, "Delhi"))];
        const picked = pickRelated(subject, published);
        expect(picked).toHaveLength(4);
        expect(picked).not.toContain("none");
        expect(picked).toEqual(["d0", "d1", "d2", "d3"]);
    });
});

describe("isStudioWrite", () => {
    it("flags writes to studio data", () => {
        for (const [model, operation] of [["Listing", "update"], ["ListingBlock", "create"], ["ListingSet", "deleteMany"], ["Review", "upsert"], ["Amenities", "create"], ["Package", "updateMany"]]) {
            expect(isStudioWrite(model, operation), `${model}.${operation}`).toBe(true);
        }
    });

    it("ignores reads and unrelated models", () => {
        expect(isStudioWrite("Listing", "findMany")).toBe(false);
        expect(isStudioWrite("Listing", "count")).toBe(false);
        expect(isStudioWrite("User", "update")).toBe(false);
        expect(isStudioWrite("Reservation", "create")).toBe(false);
        expect(isStudioWrite(undefined, "update")).toBe(false);
    });
});
