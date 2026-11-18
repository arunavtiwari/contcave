import { describe, expect, it } from "vitest";

import { quotaPauseMs } from "@/lib/ai/gemini";

describe("quotaPauseMs", () => {
    it("reads the retry delay Gemini sends with a 429", () => {
        expect(quotaPauseMs('{"error":{"details":[{"retryDelay": "12.5s"}]}}')).toBe(12_500);
    });

    it("pauses for an hour when the daily quota is spent", () => {
        expect(quotaPauseMs("Quota exceeded for requests per day")).toBe(3_600_000);
    });

    it("leaves the default pause when no delay is given", () => {
        expect(quotaPauseMs("Resource exhausted")).toBeUndefined();
    });
});
