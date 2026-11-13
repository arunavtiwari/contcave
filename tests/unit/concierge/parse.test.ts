import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { extractBriefPatch, findBudgetPerHour, findBudgetTotal, findDate, findStartTime } from "@/lib/concierge/parse";

// Thursday 12 Nov 2026, mid-afternoon in India.
const NOW = new Date("2026-11-12T09:30:00.000Z");

describe("dates", () => {
    const cases: [string, string | undefined][] = [
        ["today please", "2026-11-12"],
        ["tomorrow morning", "2026-11-13"],
        ["this saturday", "2026-11-14"],
        ["next sat", "2026-11-14"],
        ["on thursday", "2026-11-19"],
        ["this weekend", "2026-11-14"],
        ["14 dec", "2026-12-14"],
        ["december 14th", "2026-12-14"],
        ["3rd jan", "2027-01-03"],
        ["2026-11-20", "2026-11-20"],
        ["sometime soon", undefined],
        ["31 feb", undefined],
    ];
    for (const [text, expected] of cases) {
        it(`"${text}" → ${expected ?? "nothing"}`, () => assert.equal(findDate(text, NOW), expected));
    }

    it("uses the India date, not UTC, late at night", () => {
        // 11:30 pm on the 12th in India is still the 12th UTC+5:30 but 18:00 UTC.
        assert.equal(findDate("tomorrow", new Date("2026-11-12T19:00:00.000Z")), "2026-11-14");
    });
});

describe("budget and time", () => {
    it("reads an hourly budget", () => {
        assert.equal(findBudgetPerHour("under 2000 an hour"), 2000);
        assert.equal(findBudgetPerHour("₹1,500/hr max"), 1500);
        assert.equal(findBudgetPerHour("2k per hour"), 2000);
    });

    it("does not mistake a whole-shoot budget for an hourly one", () => {
        assert.equal(findBudgetPerHour("budget is 50k"), undefined);
        assert.equal(findBudgetPerHour("total budget 40000"), undefined);
        assert.equal(findBudgetPerHour("budget is 15000"), undefined);
    });

    it("reads a whole-shoot budget", () => {
        assert.equal(findBudgetTotal("budget is 50k"), 50_000);
        assert.equal(findBudgetTotal("Total budget is 60000 rupees."), 60_000);
        assert.equal(findBudgetTotal("within 2 lakh all in"), 200_000);
        assert.equal(findBudgetTotal("under 2000 an hour"), undefined);
        assert.equal(findBudgetTotal("under 1500"), undefined);
        assert.equal(findBudgetPerHour("under 1500"), 1500);
        assert.equal(findBudgetPerHour("₹8,000 per hour is fine"), 8000);
    });

    it("reads start times", () => {
        assert.equal(findStartTime("from 10am"), "10:00");
        assert.equal(findStartTime("starting 2:30 PM"), "14:30");
        assert.equal(findStartTime("at 12 am"), "00:00");
        assert.equal(findStartTime("14:00 works"), "14:00");
        assert.equal(findStartTime("for 4 hours"), undefined);
    });
});

describe("brief extraction", () => {
    it("pulls every stated fact from one message", () => {
        assert.deepEqual(extractBriefPatch("Skincare product shoot in Gurgaon this Saturday, 4 hours, 6 people, under 2000 an hour", NOW), {
            city: "Gurgaon",
            date: "2026-11-14",
            shoot_type: "product shoot",
            hours: 4,
            people: 6,
            budget_per_hour: 2000,
        });
    });

    it("maps NCR to Delhi and prefers the longer city name", () => {
        assert.equal(extractBriefPatch("anything in NCR", NOW).city, "Delhi");
        assert.equal(extractBriefPatch("studio in New Delhi", NOW).city, "New Delhi");
        assert.equal(extractBriefPatch("studio in Greater Noida", NOW).city, "Greater Noida");
    });

    it("returns nothing for small talk", () => {
        assert.deepEqual(extractBriefPatch("hello there", NOW), {});
    });
});
