import { describe, expect, it } from "vitest";

import { toGeminiSchema } from "@/lib/search/ai/gemini";
import { mergeQueries, prepareQueryText, refineWithRules } from "@/lib/search/parse";
import { parseQueryRules } from "@/lib/search/parse/rules";
import { diffOverrides, EMPTY_QUERY, overridesToParams, type ParsedQuery, parsedQuerySchema } from "@/schemas/search";

const TODAY = "2026-10-06";
const parsed = (overrides: Partial<ParsedQuery> = {}): ParsedQuery => ({ ...EMPTY_QUERY, ...overrides });

describe("mergeQueries", () => {
    it("keeps AI values and fills gaps from the rules parse", () => {
        const ai = parsed({ city: "Lucknow", needs: ["Cyclorama"] });
        const rules = parsed({ city: "Delhi", crew: 6, dates: ["2026-10-10"], inferred: ["dates"] });
        expect(mergeQueries(ai, rules)).toMatchObject({ city: "Lucknow", crew: 6, dates: ["2026-10-10"], needs: ["Cyclorama"], inferred: ["dates"] });
    });
});

describe("refineWithRules", () => {
    const current = parseQueryRules(prepareQueryText("product shoot in lucknow, 6 people, budget 10k, 4 hours"), TODAY);

    it("makes a search cheaper", () => {
        expect(refineWithRules(current, prepareQueryText("cheaper please"), TODAY).budgetMax).toBe(8000);
    });

    it("moves the area and adds must-haves without losing the rest", () => {
        const next = refineWithRules(current, prepareQueryText("closer to hazratganj, only with a makeup room"), TODAY);
        expect(next).toMatchObject({ city: "Lucknow", area: "Hazratganj", crew: 6, budgetMax: 10000 });
        expect(next.needs).toContain("Makeup Vanity");
        expect(next.shootTypes).toEqual(["Product & E-commerce"]);
    });

    it("produces URL params for only the changed fields", () => {
        const next = refineWithRules(current, prepareQueryText("for 8 people"), TODAY);
        expect(overridesToParams(diffOverrides(current, next))).toEqual({ crew: "8" });
    });
});

describe("toGeminiSchema", () => {
    it("keeps enums and drops keywords Gemini does not accept", () => {
        const schema = JSON.stringify(toGeminiSchema(parsedQuerySchema));
        expect(schema).not.toContain("\"pattern\"");
        expect(schema).not.toContain("$schema");
        expect(schema).toContain("Infinity White Cyc");
        expect(schema).toContain("\"required\"");
    });
});
