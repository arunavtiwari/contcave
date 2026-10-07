import { describe, expect, it } from "vitest";

import { acquireAiSlot, fastestFirst, recordLatency, tripBreaker } from "@/lib/search/ai/breaker";

describe("AI model routing", () => {
    it("tries untested models first, then the fastest one", () => {
        const models = ["model-a", "model-b"];
        expect(fastestFirst(models)).toEqual(["model-a", "model-b"]);
        recordLatency("model-a", 6000);
        expect(fastestFirst(models)).toEqual(["model-b", "model-a"]);
        recordLatency("model-b", 9000);
        expect(fastestFirst(models)).toEqual(["model-a", "model-b"]);
    });

    it("smooths a single slow reply instead of switching on it", () => {
        recordLatency("model-c", 1000);
        recordLatency("model-d", 2000);
        recordLatency("model-c", 4000);
        expect(fastestFirst(["model-c", "model-d"])).toEqual(["model-c", "model-d"]);
    });

    it("skips a model while its quota pause is open", () => {
        expect(acquireAiSlot("model-e", 5)).toBe(true);
        tripBreaker("model-e", 60_000);
        expect(acquireAiSlot("model-e", 5)).toBe(false);
    });

    it("caps calls per minute for each model", () => {
        expect([1, 2, 3].map(() => acquireAiSlot("model-f", 2))).toEqual([true, true, false]);
        expect(acquireAiSlot("model-g", 2)).toBe(true);
    });
});
