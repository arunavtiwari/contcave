import { describe, expect, it } from "vitest";

import { geminiConfigured } from "@/lib/search/ai/gemini";
import { parseQueryWithAi, prepareQueryText } from "@/lib/search/parse";
import { parseQueryRules, unparsedWords } from "@/lib/search/parse/rules";
import type { ParsedQuery } from "@/schemas/search";

import { FIXTURE_TODAY,QUERY_FIXTURES, type QueryFixture } from "./queries.fixture";

const TARGET = 0.9;
const HEADLINE_FIELDS = ["city", "dates", "crew", "budget"] as const;
const AI_LIMIT = Number(process.env.SEARCH_EVAL_AI_LIMIT || 20);
const AI_SPACING_MS = 7_500;

type FieldScore = { correct: number; total: number; misses: string[] };

const sameList = (a: unknown[], b: unknown[]) => a.length === b.length && a.every((value, index) => value === b[index]);
const containsAll = (actual: unknown[], expected: unknown[]) => expected.every((value) => actual.includes(value));

function compare(field: string, fixture: QueryFixture, parsed: ParsedQuery): boolean | null {
    const expected = fixture.expect;
    if (field === "budget") {
        if (expected.budgetMin === undefined && expected.budgetMax === undefined) return null;
        return (expected.budgetMin === undefined || parsed.budgetMin === expected.budgetMin)
            && (expected.budgetMax === undefined || parsed.budgetMax === expected.budgetMax)
            && (expected.budgetBasis === undefined || parsed.budgetBasis === expected.budgetBasis);
    }
    const want = expected[field as keyof QueryFixture["expect"]];
    if (want === undefined) return null;
    const actual = parsed[field as keyof ParsedQuery];
    if (field === "dates") return sameList(actual as unknown[], want as unknown[]);
    if (Array.isArray(want)) return containsAll(actual as unknown[], want);
    return actual === want;
}

const FIELDS = ["intent", "city", "area", "dates", "crew", "hours", "budget", "shootTypes", "needs"] as const;

function evaluate(results: { fixture: QueryFixture; parsed: ParsedQuery }[]) {
    const scores = Object.fromEntries(FIELDS.map((field) => [field, { correct: 0, total: 0, misses: [] } as FieldScore]));
    for (const { fixture, parsed } of results) {
        for (const field of FIELDS) {
            const outcome = compare(field, fixture, parsed);
            if (outcome === null) continue;
            scores[field].total += 1;
            if (outcome) scores[field].correct += 1;
            else scores[field].misses.push(fixture.text);
        }
    }
    return scores;
}

function report(label: string, scores: Record<string, FieldScore>) {
    const lines = Object.entries(scores).map(([field, score]) => {
        const accuracy = score.total ? score.correct / score.total : 1;
        const flag = (HEADLINE_FIELDS as readonly string[]).includes(field) ? (accuracy >= TARGET ? " ✓" : " ✗ below 90%") : "";
        return `  ${field.padEnd(11)} ${(accuracy * 100).toFixed(1).padStart(5)}%  (${score.correct}/${score.total})${flag}`;
    });
    const misses = Object.entries(scores).flatMap(([field, score]) => score.misses.map((text) => `  [${field}] ${text}`));
    process.stdout.write(`\n${label}\n${lines.join("\n")}\n${misses.length ? `Misses:\n${misses.join("\n")}\n` : ""}`);
    return Math.min(...HEADLINE_FIELDS.map((field) => (scores[field].total ? scores[field].correct / scores[field].total : 1)));
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function latencySummary(latencies: number[]) {
    const sorted = [...latencies].sort((a, b) => a - b);
    const at = (share: number) => sorted[Math.min(sorted.length - 1, Math.ceil(share * sorted.length) - 1)];
    return `latency p50 ${at(0.5)} ms, p90 ${at(0.9)} ms, max ${sorted[sorted.length - 1]} ms`;
}

describe("query parser evaluation", () => {
    it("scores the rule-based reader", () => {
        const results = QUERY_FIXTURES.map((fixture) => ({ fixture, parsed: parseQueryRules(prepareQueryText(fixture.text), FIXTURE_TODAY) }));
        const instant = QUERY_FIXTURES.filter((fixture) => unparsedWords(prepareQueryText(fixture.text)).length === 0).length;
        const headline = report(`Rule-based reader on ${results.length} queries (${instant} fully understood without AI)`, evaluate(results));
        expect(headline).toBeGreaterThan(0);
    });

    it.skipIf(!geminiConfigured())("scores the Gemini reader", async () => {
        const results: { fixture: QueryFixture; parsed: ParsedQuery }[] = [];
        const latencies: number[] = [];
        let fallbacks = 0;
        for (const fixture of QUERY_FIXTURES.slice(0, AI_LIMIT)) {
            const text = prepareQueryText(fixture.text);
            const startedAt = Date.now();
            const parsed = await parseQueryWithAi(text, FIXTURE_TODAY).catch(() => {
                fallbacks += 1;
                return parseQueryRules(text, FIXTURE_TODAY);
            });
            latencies.push(Date.now() - startedAt);
            results.push({ fixture, parsed });
            await sleep(AI_SPACING_MS);
        }
        const label = `Gemini reader on ${results.length} queries (${latencySummary(latencies)}; ${fallbacks} fell back to rules)`;
        const headline = report(label, evaluate(results));
        expect(headline).toBeGreaterThan(0);
    });
});
