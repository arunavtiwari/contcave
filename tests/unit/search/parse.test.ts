import { describe, expect, it } from "vitest";

import { prepareQueryText } from "@/lib/search/parse";
import { parseDates } from "@/lib/search/parse/dates";
import { parseQueryRules, unparsedWords } from "@/lib/search/parse/rules";
import { redactPersonalData } from "@/lib/search/redact";
import { extractTerms, normalizeText } from "@/lib/search/vocabulary";
import { EMPTY_QUERY, overridesToParams, parseSearchParams, sanitizeQuery } from "@/schemas/search";

const TODAY = "2026-10-06";

describe("parseDates", () => {
    const dates = (text: string) => parseDates(normalizeText(text), TODAY);

    it("resolves relative days in IST", () => {
        expect(dates("tomorrow").dates).toEqual(["2026-10-07"]);
        expect(dates("kal shoot hai").dates).toEqual(["2026-10-07"]);
        expect(dates("parso").dates).toEqual(["2026-10-08"]);
        expect(dates("today").dates).toEqual([TODAY]);
    });

    it("treats next weekday as the coming one and marks it inferred", () => {
        const result = dates("next Saturday");
        expect(result.dates).toEqual(["2026-10-10"]);
        expect(result.inferred).toBe(true);
        expect(dates("this saturday").inferred).toBe(false);
        expect(dates("next tuesday").dates).toEqual(["2026-10-13"]);
    });

    it("expands weekends and explicit ranges", () => {
        expect(dates("this weekend").dates).toEqual(["2026-10-10", "2026-10-11"]);
        expect(dates("10-12 oct").dates).toEqual(["2026-10-10", "2026-10-11", "2026-10-12"]);
        expect(dates("15th November").dates).toEqual(["2026-11-15"]);
        expect(dates("oct 20").dates).toEqual(["2026-10-20"]);
        expect(dates("20/10").dates).toEqual(["2026-10-20"]);
    });

    it("drops past and out-of-horizon dates", () => {
        expect(dates("1 oct 2026")).toMatchObject({ dates: [], dropped: "past" });
        expect(dates("10 mar 2027")).toMatchObject({ dates: [], dropped: "horizon" });
    });

    it("does not read decimals, budgets or 24/7 as dates", () => {
        expect(dates("8.5 hrs").dates).toEqual([]);
        expect(dates("8-10k budget").dates).toEqual([]);
    });

    it("flags flexible requests without dates", () => {
        expect(dates("sometime next month").flexible).toBe(true);
    });
});

describe("parseQueryRules", () => {
    it("parses the example from the developer spec", () => {
        const parsed = parseQueryRules(
            "Skincare product shoot next Saturday, 6 people, around Gomti Nagar, need a white cyc and natural light, budget 8–10k for 4 hours.",
            TODAY,
        );
        expect(parsed).toMatchObject({
            intent: "search",
            city: "Lucknow",
            area: "Gomti Nagar",
            dates: ["2026-10-10"],
            crew: 6,
            hours: 4,
            budgetMin: 8000,
            budgetMax: 10000,
            budgetBasis: "total",
            shootTypes: ["Product & E-commerce"],
            needs: expect.arrayContaining(["Infinity White Cyc", "Natural Light"]),
        });
        expect(parsed.inferred).toEqual(expect.arrayContaining(["city", "dates"]));
        expect(parsed.needs).not.toContain("Cyclorama");
    });

    it("understands shorthand and Hinglish", () => {
        const parsed = parseQueryRules("lko mein podcast ke liye studio chahiye kal 3 ghante 4 log under 1500/hr", TODAY);
        expect(parsed).toMatchObject({
            city: "Lucknow",
            dates: ["2026-10-07"],
            hours: 3,
            crew: 4,
            budgetMax: 1500,
            budgetBasis: "hourly",
            shootTypes: ["Podcast & Interview"],
        });
    });

    it("reads time ranges into a start time and duration", () => {
        const parsed = parseQueryRules("fashion shoot in gurgaon on 20 oct 10-2pm, green screen, 8 pax", TODAY);
        expect(parsed).toMatchObject({ city: "Gurugram", startTime: "10:00", hours: 4, crew: 8, needs: ["Green Screen"] });
        expect(parsed.vibes).not.toContain("Natural & Greenery");
    });

    it("prefers longer phrases so localities and features are not misread", () => {
        const parsed = parseQueryRules("reel shoot near film city noida", TODAY);
        expect(parsed.area).toBe("Film City");
        expect(parsed.shootTypes).toEqual(["UGC & Reels"]);
    });

    it("routes non-search questions to help", () => {
        expect(parseQueryRules("how do I get a refund?", TODAY).intent).toBe("other");
        expect(parseQueryRules("hi", TODAY).intent).toBe("other");
    });

    it("parses money in several shapes", () => {
        expect(parseQueryRules("budget 10,000", TODAY)).toMatchObject({ budgetMax: 10000, budgetMin: null });
        expect(parseQueryRules("₹5000 to ₹7000 delhi", TODAY)).toMatchObject({ budgetMin: 5000, budgetMax: 7000 });
        expect(parseQueryRules("above 20k studio in noida", TODAY)).toMatchObject({ budgetMin: 20000, budgetMax: null });
        expect(parseQueryRules("6-8 people in delhi", TODAY)).toMatchObject({ budgetMin: null, budgetMax: null });
    });
});

describe("vocabulary", () => {
    it("maps city aliases and groups", () => {
        expect(extractTerms("studio in bangalore").cities).toEqual(["Bengaluru"]);
        expect(extractTerms("anywhere in delhi ncr").cities).toEqual(["Delhi NCR"]);
    });
});

describe("redactPersonalData", () => {
    it("removes phones and emails but keeps budgets", () => {
        const text = redactPersonalData("call me on +91 98765 43210 or 9876543210, mail a.b@example.com, budget 10000-20000");
        expect(text).toBe("call me on [phone] or [phone], mail [email], budget 10000-20000");
    });
});

describe("parsed query schema", () => {
    it("drops unknown labels instead of failing", () => {
        const parsed = sanitizeQuery({ ...EMPTY_QUERY, needs: ["Cyclorama", "Unicorn"], crew: -3, city: "Lucknow" });
        expect(parsed.needs).toEqual(["Cyclorama"]);
        expect(parsed.crew).toBeNull();
        expect(parsed.city).toBe("Lucknow");
    });

    it("round-trips chip overrides through URL params", () => {
        const overrides = { city: "Lucknow", dates: ["2026-10-10"], crew: 8, budgetMin: null, budgetMax: 12000, needs: [] };
        const parsed = parseSearchParams({ q: "test", ...overridesToParams(overrides) });
        expect(parsed.query).toBe("test");
        expect(parsed.overrides).toEqual(overrides);
    });

    it("drops text fields that carry a phone number or email", () => {
        const parsed = sanitizeQuery({ ...EMPTY_QUERY, city: "Lucknow a.b@example.com", area: "call 9876543210" });
        expect(parsed).toMatchObject({ city: null, area: null });
        const fromUrl = parseSearchParams({ q: "test", ...overridesToParams({ city: "Lucknow", area: "+91 98765 43210" }) });
        expect(fromUrl.overrides).toEqual({ city: "Lucknow" });
    });
});

describe("unparsedWords", () => {
    const unparsed = (text: string) => unparsedWords(prepareQueryText(text));

    it("is empty when the rules understood every word", () => {
        expect(unparsed("Skincare product shoot next Saturday, 6 people, around Gomti Nagar, need a white cyc and natural light, budget 8–10k for 4 hours")).toEqual([]);
        expect(unparsed("lko mein podcast ke liye studio chahiye kal 3 ghante 4 log under 1500/hr")).toEqual([]);
    });

    it("lists the words only the AI can interpret", () => {
        expect(unparsed("cozy living room vibe for a diwali campaign in lucknow")).toEqual(["diwali", "campaign"]);
    });
});
