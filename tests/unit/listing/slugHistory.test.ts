import { describe, expect, it } from "vitest";

import { slugHistory } from "@/lib/listing/utils";

describe("slug history", () => {
    it("keeps the replaced slug so old links can redirect", () => {
        expect(slugHistory([], "creative-indoor-studio-with-3-curated-sets", "indoor-studio-with-3-curated-sets-in-rohini"))
            .toEqual(["creative-indoor-studio-with-3-curated-sets"]);
    });

    it("keeps every earlier slug once", () => {
        expect(slugHistory(["first", "second"], "second", "third")).toEqual(["first", "second"]);
    });

    it("drops a slug that becomes current again", () => {
        expect(slugHistory(["first", "second"], "third", "first")).toEqual(["second", "third"]);
    });
});
