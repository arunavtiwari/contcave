#!/usr/bin/env node
/**
 * Runs evals/concierge/cases.json against a running site and reports what
 * passed. Every case is a fresh conversation; each turn is checked on what
 * the customer would see (cards, brief, reply text), never on internals.
 *
 *   node scripts/concierge-eval.mjs [baseUrl] [--only id,id] [--out file.json] [--pause seconds]
 *
 * Needs studios in Delhi and Mumbai in the database it points at. Run it
 * before shipping any change to prompts, tools, guardrails or the model.
 */
import { readFileSync, writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const base = (args.find((arg) => arg.startsWith("http")) ?? "http://localhost:3000").replace(/\/+$/, "");
const only = flag("--only")?.split(",");
const out = flag("--out");
/** Seconds to wait between turns, for model servers with tight per-minute limits. */
const pause = Number(flag("--pause") ?? 0) * 1000;
const cases = JSON.parse(readFileSync(new URL("../evals/concierge/cases.json", import.meta.url), "utf8")).filter((c) => !only || only.includes(c.id));

/** "(?i)abc" → /abc/i, so case files stay plain JSON. */
const regex = (source) => (source.startsWith("(?i)") ? new RegExp(source.slice(4), "i") : new RegExp(source));

async function turn(cookie, conversationId, message) {
    const started = Date.now();
    const response = await fetch(`${base}/api/concierge/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: base, ...(cookie ? { Cookie: cookie } : {}) },
        body: JSON.stringify({ message, conversationId, startNew: !conversationId }),
    });
    const setCookie = response.headers.getSetCookie?.().map((value) => value.split(";")[0]).join("; ");
    if (!response.ok) return { error: `HTTP ${response.status}: ${(await response.text()).slice(0, 200)}`, cookie: setCookie || cookie };
    const result = { cards: [], brief: null, text: "", replaced: false, conversationId, cookie: setCookie || cookie, firstTextMs: null };
    const decoder = new TextDecoder();
    let buffer = "";
    for await (const chunk of response.body) {
        buffer += decoder.decode(chunk, { stream: true });
        let newline;
        while ((newline = buffer.indexOf("\n")) >= 0) {
            const line = buffer.slice(0, newline).trim();
            buffer = buffer.slice(newline + 1);
            if (!line) continue;
            const event = JSON.parse(line);
            if (event.type === "start") result.conversationId = event.conversationId;
            if (event.type === "text" && result.firstTextMs === null) result.firstTextMs = Date.now() - started;
            if (event.type === "card") result.cards.push(event.card);
            if (event.type === "brief") result.brief = event.brief;
            if (event.type === "replace") result.replaced = true;
            if (event.type === "done") result.text = event.message.text;
            if (event.type === "error") result.error = event.message;
        }
    }
    result.ms = Date.now() - started;
    return result;
}

function check(expect, got, brief) {
    const problems = [];
    const types = got.cards.map((card) => card.type);
    for (const type of expect.cards ?? []) if (!types.includes(type)) problems.push(`expected a ${type} card, got [${types.join(", ") || "none"}]`);
    for (const type of expect.noCards ?? []) if (types.includes(type)) problems.push(`unexpected ${type} card`);
    for (const source of expect.text ?? []) if (!regex(source).test(got.text)) problems.push(`reply should match /${source}/`);
    for (const source of expect.notText ?? []) if (regex(source).test(got.text)) problems.push(`reply must not match /${source}/`);
    if (expect.maxChars && got.text.length > expect.maxChars) problems.push(`reply is ${got.text.length} chars, limit ${expect.maxChars}`);
    for (const [key, value] of Object.entries(expect.brief ?? {})) {
        if (String(brief?.[key] ?? "").toLowerCase() !== String(value).toLowerCase()) problems.push(`brief.${key} should be ${value}, is ${brief?.[key]}`);
    }
    if (expect.briefWeekday) {
        const day = brief?.date ? new Date(`${brief.date}T00:00:00Z`).toLocaleDateString("en-IN", { weekday: "short", timeZone: "UTC" }) : "unset";
        if (day !== expect.briefWeekday) problems.push(`brief.date should be a ${expect.briefWeekday}, is ${brief?.date} (${day})`);
    }
    if (expect.maxCardPrice) {
        const studios = got.cards.filter((card) => card.type === "studios").flatMap((card) => card.items);
        for (const studio of studios) {
            const price = studio.price ?? studio.priceRange?.min;
            if (price == null || price > expect.maxCardPrice) problems.push(`${studio.title} at ${price} is over the ${expect.maxCardPrice} budget`);
        }
    }
    if (expect.quoteAddsUp) {
        const quote = got.cards.find((card) => card.type === "quote");
        if (quote) {
            const subtotal = quote.lines.reduce((sum, line) => sum + line.amount, 0);
            if (Math.abs(subtotal + quote.gst - quote.total) > 0.01) problems.push("quote lines + GST do not equal the total");
            if (Math.abs(quote.gst - subtotal * 0.18) > 0.01) problems.push("GST is not 18% of the subtotal");
        }
    }
    if (expect.planBudget) {
        const plan = got.cards.find((card) => card.type === "plan");
        const sum = plan?.budget.reduce((total, line) => total + line.amount, 0);
        if (plan && sum !== expect.planBudget) problems.push(`plan budget lines total ${sum}, expected ${expect.planBudget}`);
    }
    // Checks that hold for every reply, whatever the case is about.
    if (!got.text.trim()) problems.push("empty reply");
    if (/<think>|<tool_call>|"tool_calls"|\bsearch_studios\b|\bupdate_brief\b/.test(got.text)) problems.push("internal markup or tool names in the reply");
    if (/\b[6-9]\d{9}\b/.test(got.text.replace(/₹[\d,]+/g, ""))) problems.push("a phone number in the reply");
    return problems;
}

const results = [];
for (const testCase of cases) {
    let cookie = "";
    let conversationId = null;
    let brief = null;
    const problems = [];
    const times = [];
    let replaced = 0;
    for (const [index, expected] of testCase.turns.entries()) {
        // A dropped connection fails this case, not the whole run.
        if (pause) await new Promise((resolve) => setTimeout(resolve, pause));
        const got = await turn(cookie, conversationId, expected.say).catch((error) => ({ error: `request failed: ${error.message}`, cookie }));
        cookie = got.cookie;
        if (got.error) { problems.push(`turn ${index + 1}: ${got.error}`); break; }
        conversationId = got.conversationId;
        brief = got.brief ?? brief;
        times.push(got.ms);
        if (got.replaced) replaced += 1;
        for (const problem of check(expected, got, brief)) problems.push(`turn ${index + 1}: ${problem}\n        reply: ${got.text.replace(/\s+/g, " ").slice(0, 220)}`);
    }
    const passed = problems.length === 0;
    results.push({ id: testCase.id, passed, problems, times, replaced });
    console.log(`${passed ? "PASS" : "FAIL"}  ${testCase.id.padEnd(22)} ${times.map((ms) => `${(ms / 1000).toFixed(0)}s`).join(" ")}${replaced ? `  (guardrail rewrote ${replaced})` : ""}`);
    for (const problem of problems) console.log(`      ${problem}`);
}

const passed = results.filter((result) => result.passed).length;
const all = results.flatMap((result) => result.times).sort((a, b) => a - b);
const pct = (q) => (all.length ? (all[Math.min(all.length - 1, Math.floor(all.length * q))] / 1000).toFixed(1) : "-");
console.log(`\n${passed}/${results.length} cases passed · ${all.length} turns · median ${pct(0.5)}s · p90 ${pct(0.9)}s · guardrail rewrites ${results.reduce((n, r) => n + r.replaced, 0)}`);
if (out) writeFileSync(out, JSON.stringify({ base, at: new Date().toISOString(), passed, total: results.length, results }, null, 2));
process.exit(passed === results.length ? 0 : 1);
