import assert from "node:assert/strict";

import { describe, it } from "vitest";

import { resolveStudio, routedReply, routeIntent } from "@/lib/concierge/router";

const route = (text: string, overrides: Partial<Parameters<typeof routeIntent>[0]> = {}) =>
    routeIntent({ text, brief: {}, namedPlaceOrShoot: false, studiosShown: false, alreadyHandedOff: false, ...overrides })?.tool ?? null;

describe("handover routing", () => {
    for (const text of [
        "Can I talk to a real person please?",
        "connect me to someone from your team",
        "I want to speak with a human",
        "is there customer support I can call",
        "The studio was locked when I arrived and nobody came. I want my money back now.",
        "I was charged twice for my booking",
        "I want a refund for yesterday",
        "this is a complaint about the host",
    ]) {
        it(`hands over: "${text}"`, () => assert.equal(route(text), "handoff_to_human"));
    }

    for (const text of [
        "Can I get a refund if I cancel two days before?",
        "what is your refund policy",
        "studio for 5 people in Delhi",
        "I need a product shoot studio for one person",
        "is the host friendly?",
    ]) {
        it(`does not hand over: "${text}"`, () => assert.notEqual(route(text), "handoff_to_human"));
    }

    it("does not hand over twice", () => {
        assert.equal(route("talk to a human", { alreadyHandedOff: true }), null);
    });
});

describe("plan routing", () => {
    it("drafts a plan when asked", () => {
        assert.equal(route("Plan a 4 hour skincare shoot day for me in Delhi", { namedPlaceOrShoot: true, brief: { city: "Delhi", shootType: "product shoot" } }), "draft_plan");
        assert.equal(route("can you make a shot list and schedule"), "draft_plan");
    });

    it("leaves look-alikes to the model", () => {
        assert.equal(route("I'm planning to shoot next month"), null);
        assert.equal(route("what's the cancellation plan"), null);
    });
});

describe("search routing", () => {
    const brief = { city: "Delhi", shootType: "product shoot" };

    it("searches the first time a city and a shoot are known", () => {
        const routed = routeIntent({ text: "product shoot in Delhi", brief: { ...brief, date: "2026-11-14", budgetPerHour: 2000 }, namedPlaceOrShoot: true, studiosShown: false, alreadyHandedOff: false });
        assert.deepEqual(routed, { tool: "search_studios", args: { city: "Delhi", shoot_type: "product", date: "2026-11-14", max_price_per_hour: 2000 } });
    });

    it("does not search again once studios are on screen", () => {
        assert.equal(route("product shoot in Delhi", { brief, namedPlaceOrShoot: true, studiosShown: true }), null);
    });

    it("does not search without a city, or on a policy question", () => {
        assert.equal(route("I need a product shoot studio", { brief: { shootType: "product shoot" }, namedPlaceOrShoot: true }), null);
        assert.equal(route("what is the cancellation policy for a product shoot in Delhi", { brief, namedPlaceOrShoot: true }), null);
    });

    it("leaves ordinary follow-ups to the model", () => {
        assert.equal(route("is the first one free on Sunday?", { brief, studiosShown: true }), null);
        assert.equal(route("price it from 10am for 4 hours", { brief, studiosShown: true }), null);
    });
});

describe("booking routing", () => {
    const shown = [
        { id: "a".repeat(24), title: "Lightbox Studio", bookable: true },
        { id: "b".repeat(24), title: "Haveli House", bookable: false },
    ];
    const book = (text: string) => routeIntent({ text, brief: { date: "2026-11-14", hours: 3 }, namedPlaceOrShoot: false, studiosShown: true, alreadyHandedOff: false, shown, startTime: undefined });

    it("opens the booking page for a verified studio, by position or by name", () => {
        assert.deepEqual(book("Perfect, I want to book the first one"), { tool: "start_booking", args: { studio_id: "a".repeat(24), date: "2026-11-14", hours: 3 } });
        assert.equal(book("go ahead with Lightbox Studio")?.tool, "start_booking");
    });

    it("sends a curated studio to the team instead", () => {
        assert.equal(book("book the second one")?.tool, "handoff_to_human");
    });

    it("does not treat questions about booking as a request to book", () => {
        assert.equal(book("how do I book the first one?"), null);
        assert.equal(book("I booked the first one yesterday, where is it?"), null);
        assert.equal(book("I'd like to book something"), null);
    });
});

describe("studio resolution", () => {
    const shown = [{ title: "Alpha" }, { title: "Beta Loft" }, { title: "Gamma" }];
    it("finds a studio by name, position or as the only one", () => {
        assert.equal(resolveStudio("is beta loft free?", shown)?.title, "Beta Loft");
        assert.equal(resolveStudio("the 3rd option", shown)?.title, "Gamma");
        assert.equal(resolveStudio("the last one", shown)?.title, "Gamma");
        assert.equal(resolveStudio("book it", [shown[0]])?.title, "Alpha");
        assert.equal(resolveStudio("book it", shown), undefined);
        assert.equal(resolveStudio("the fourth one", shown), undefined);
    });
});

describe("reply when the model is unreachable after a routed tool", () => {
    it("describes search results without inventing anything", () => {
        const reply = routedReply({ tool: "search_studios", args: {} }, { studios: [{}, {}], relaxed_filters: ["aesthetics"] }, { city: "Delhi", shootType: "product shoot" });
        assert.equal(reply, "Here are 2 studios in Delhi for a product shoot. Nothing matched everything, so I loosened the aesthetics. Tell me your date and how many hours you need and I'll narrow it down.");
        assert.ok(!/₹/.test(reply));
    });

    it("says so when nothing was found", () => {
        const reply = routedReply({ tool: "search_studios", args: {} }, { studios: [], note: "No studios listed in Kochi yet." }, { city: "Kochi" });
        assert.ok(reply.startsWith("No studios listed in Kochi yet."));
    });

    it("never claims a booking", () => {
        const reply = routedReply({ tool: "start_booking", args: {} }, { booking_page_shown: true }, {});
        assert.ok(/nothing is booked until/.test(reply));
    });
});
