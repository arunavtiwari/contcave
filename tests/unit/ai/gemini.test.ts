import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AiUnavailableError, overloadRetryDelayMs, quotaPauseMs, withGeminiModels } from "@/lib/ai/gemini";

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

describe("overloadRetryDelayMs", () => {
    it("grows exponentially with full jitter", () => {
        expect(overloadRetryDelayMs(0, () => 1)).toBe(400);
        expect(overloadRetryDelayMs(1, () => 1)).toBe(800);
        expect(overloadRetryDelayMs(1, () => 0)).toBe(0);
    });
});

describe("withGeminiModels", () => {
    const failure = (status: number) => Object.assign(new Error(`status ${status}`), { status });
    let models = 0;
    const policy = () => ({ models: [`a-${++models}`, `b-${models}`], perModelPerMinute: 100, order: "listed" as const });

    beforeEach(() => {
        vi.stubEnv("GEMINI_API_KEY", "test-key");
        vi.spyOn(console, "warn").mockImplementation(() => {});
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllEnvs();
        vi.restoreAllMocks();
    });

    it("retries an overloaded model once before trying the next", async () => {
        const run = vi.fn().mockRejectedValueOnce(failure(503)).mockResolvedValueOnce("ok");
        const result = withGeminiModels("test", policy(), run);
        await vi.runAllTimersAsync();
        await expect(result).resolves.toBe("ok");
        expect(run.mock.calls.map(([model]) => model[0])).toEqual(["a", "a"]);
    });

    it("moves straight to the next model after a timeout", async () => {
        const run = vi.fn().mockRejectedValueOnce(failure(504)).mockResolvedValueOnce("ok");
        await expect(withGeminiModels("test", policy(), run)).resolves.toBe("ok");
        expect(run.mock.calls.map(([model]) => model[0])).toEqual(["a", "b"]);
    });

    it("gives up after every model is overloaded twice", async () => {
        const run = vi.fn().mockRejectedValue(failure(503));
        const result = withGeminiModels("test", policy(), run);
        const settled = expect(result).rejects.toBeInstanceOf(AiUnavailableError);
        await vi.runAllTimersAsync();
        await settled;
        expect(run).toHaveBeenCalledTimes(4);
    });

    it("rethrows errors that retrying can't fix", async () => {
        const run = vi.fn().mockRejectedValue(failure(400));
        await expect(withGeminiModels("test", policy(), run)).rejects.toThrow("status 400");
        expect(run).toHaveBeenCalledTimes(1);
    });
});
