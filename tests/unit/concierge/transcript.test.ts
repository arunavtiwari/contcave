import { describe, expect, it } from "vitest";

import { readTranscript } from "@/lib/concierge/transcript";

const message = (cards: unknown[]) => ({ id: "m1", role: "assistant", text: "Here you go", cards, at: "2026-11-18T10:00:00.000Z" });

describe("readTranscript", () => {
    it("upgrades a studios card saved before the shared search", () => {
        const [read] = readTranscript([
            message([
                {
                    type: "studios",
                    relaxed: ["aesthetics"],
                    items: [
                        { id: "a1", title: "Echo Room", url: "/studio/echo", image: null, locality: "Okhla", price: 1500, priceRange: null, people: 8, areaSqFt: 900, rating: 4.6, bookable: true, lightsIncluded: true },
                        { id: "a2", title: "Haveli", url: "/studio/haveli", image: null, locality: "Mehrauli", price: null, priceRange: { min: 2000, max: 3000 }, people: null, areaSqFt: null, rating: null, bookable: false, lightsIncluded: false },
                    ],
                },
            ]),
        ]);
        expect(read.cards).toEqual([
            {
                type: "studios",
                notices: [],
                items: [
                    { id: "a1", title: "Echo Room", url: "/studio/echo", image: null, location: "Okhla", estimate: "₹1,500/hr", availability: "", rating: 4.6, bookable: true, fallback: false },
                    { id: "a2", title: "Haveli", url: "/studio/haveli", image: null, location: "Mehrauli", estimate: "₹2,000–₹3,000/hr", availability: "", rating: null, bookable: false, fallback: false },
                ],
            },
        ]);
    });

    it("keeps current cards as they are", () => {
        const card = {
            type: "studios",
            notices: ["Add a date to see live availability."],
            items: [{ id: "a1", title: "Echo Room", url: "/studio/echo", image: "x.jpg", location: "Delhi", estimate: "₹1,770 for 1 hrs incl. GST", availability: "Likely free 9:00 AM – 9:00 PM", rating: 4.6, bookable: true, fallback: true }],
        };
        expect(readTranscript([message([card])])[0].cards).toEqual([card]);
    });

    it("drops what can't be shown instead of crashing", () => {
        const [read] = readTranscript([message([null, { type: "studios" }, { type: "studios", items: [{ title: "no id" }] }, { type: "shortlist", url: "/s/abc", count: 3 }])]);
        expect(read.cards).toEqual([{ type: "shortlist", url: "/s/abc", count: 3 }]);
        expect(readTranscript(null)).toEqual([]);
        expect(readTranscript([{ id: "m2", role: "user", text: "hi", at: "2026-11-18T10:00:00.000Z" }])[0].cards).toEqual([]);
    });
});
