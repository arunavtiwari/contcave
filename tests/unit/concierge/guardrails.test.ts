import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { checkReply, cleanUserMessage, collectDates, collectNumbers, HIDDEN, maskContactDetails, MaskedStream, ungroundedAmounts } from "@/lib/concierge/guardrails";

describe("contact masking", () => {
    it("masks phones, emails, handles and chat links", () => {
        assert.equal(maskContactDetails("Call 9876543210 now"), `Call ${HIDDEN} now`);
        assert.equal(maskContactDetails("WhatsApp +91 98765 43210"), `WhatsApp ${HIDDEN}`);
        assert.equal(maskContactDetails("mail host@example.test to book"), `mail ${HIDDEN} to book`);
        assert.equal(maskContactDetails("DM @studio.delhi"), `DM ${HIDDEN}`);
        assert.equal(maskContactDetails("https://wa.me/919876543210"), HIDDEN);
    });

    it("leaves prices, dates and ContCave links alone", () => {
        const text = "₹14,160 total for 4 hours on 2026-11-14";
        assert.equal(maskContactDetails(text), text);
        assert.equal(maskContactDetails("Budget ₹9876543210"), "Budget ₹9876543210");
        const link = "see https://contcave.com/studio/x";
        assert.equal(maskContactDetails(link, { allowLinkHosts: ["contcave.com"] }), link);
    });

    it("is idempotent", () => {
        const once = maskContactDetails("Call 9876543210 or host@example.test");
        assert.equal(maskContactDetails(once), once);
    });

    it("masks a phone number and an email split across stream chunks", () => {
        const stream = new MaskedStream();
        let out = "";
        for (const delta of ["Reach the host on 98765", " 43210 or at ho", "st@example.test, but booking here is safer. ", "Want me to check Saturday?"]) {
            out += stream.push(delta);
        }
        out += stream.flush();
        assert.ok(!out.includes("98765"));
        assert.ok(!out.includes("example.test"));
        assert.ok(out.endsWith("Want me to check Saturday?"));
        assert.equal(out, stream.text);
    });
});

describe("grounding", () => {
    const known = collectNumbers([{ price_per_hour: 3000, subtotal: 12000, gst: 2160, total: 14160 }, "my budget is 50k or ₹2,000/hr, maybe 2 lakh overall"]);

    it("accepts amounts a tool returned or the customer wrote", () => {
        assert.deepEqual(ungroundedAmounts("₹3,000 an hour, ₹14,160 total, within your ₹50k, ₹2,000 and ₹2 lakh", known), []);
    });

    it("flags an amount nobody supplied", () => {
        assert.deepEqual(ungroundedAmounts("It's about ₹9,500 all in", known), [9500]);
        assert.deepEqual(ungroundedAmounts("Rs. 4500 or INR 800", known), [4500, 800]);
    });

    it("treats paise rounding as the same amount", () => {
        assert.deepEqual(ungroundedAmounts("₹2,360", collectNumbers({ total: 2360.0 })), []);
    });
});

describe("reply check", () => {
    const known = collectNumbers({ price_per_hour: 3000, total: 14160 });

    it("removes an invented price and a false confirmation, keeps the rest", () => {
        const result = checkReply("Great choice. It will cost ₹9,500 in total. Your booking is confirmed. Shall I plan the day?", known);
        assert.equal(result.changed, true);
        assert.deepEqual([...result.reasons].sort(), ["false_confirmation", "ungrounded_amount"]);
        assert.ok(!/9,500|is confirmed/.test(result.text));
        assert.ok(result.text.includes("Shall I plan the day?"));
    });

    it("leaves a grounded reply untouched", () => {
        const reply = "**Brick & Beam** is ₹3,000 an hour; 4 hours comes to ₹14,160 with GST.";
        const result = checkReply(reply, known);
        assert.equal(result.changed, false);
        assert.equal(result.text, reply);
    });

    for (const claim of ["I've booked the studio for you.", "Payment has been received.", "Your refund has been approved.", "The slot is now reserved.", "I have applied a discount for you."]) {
        it(`removes "${claim}"`, () => {
            const result = checkReply(`${claim} Anything else?`, known);
            assert.ok(result.reasons.includes("false_confirmation"));
            assert.ok(!result.text.includes(claim));
        });
    }

    it("removes a bare 'Booking confirmed' headline", () => {
        const result = checkReply("Booking confirmed: Andheri Lab, tomorrow 9 AM. Tap to pay.", known);
        assert.ok(result.reasons.includes("false_confirmation"));
        assert.ok(!/Booking confirmed/.test(result.text));
    });

    it("keeps sentences that describe what happens once a booking is confirmed", () => {
        for (const reply of ["The exact address is sent once the booking is confirmed.", "Nothing is booked until you pay on the studio page.", "You'll be told as soon as your booking is confirmed by the host."]) {
            assert.equal(checkReply(reply, known).changed, false, reply);
        }
    });

    it("does not treat a policy explanation as a confirmation", () => {
        const reply = "Refunds go back to the original payment method within 5–7 business days.";
        assert.equal(checkReply(reply, known).changed, false);
    });

    it("drops the invented figure quietly when a card already shows the real prices", () => {
        const result = checkReply("Bandra Sunroom is a great fit. It should come to ₹9,999. Want more options?", known, { pricesOnScreen: true });
        assert.equal(result.text, "Bandra Sunroom is a great fit. Want more options?");
    });

    it("never returns an empty reply", () => {
        assert.ok(checkReply("It costs ₹1.", new Set()).text.length > 20);
    });
});

describe("input cleaning", () => {
    it("trims, strips control characters and caps the length", () => {
        assert.equal(cleanUserMessage("  hi\u0000 there  "), "hi there");
        assert.equal(cleanUserMessage("   "), null);
        assert.equal(cleanUserMessage(42), null);
        assert.equal(cleanUserMessage("x".repeat(5000))?.length, 1200);
    });
});

describe("date grounding", () => {
    const dates = collectDates(["coming days: Thu 2026-11-12, Fri 2026-11-13, Sat 2026-11-14, Sun 2026-11-15", { date: "2026-11-15" }, "we were thinking of 3rd Jan"]);

    it("collects ISO dates and dates written in words", () => {
        assert.ok(dates.has("11-15") && dates.has("01-03"));
    });

    it("cuts a wrong date given as an aside and keeps the sentence", () => {
        const result = checkReply("Here are three studios for this Sunday (Sat, 14 Dec 2026) for 3 hours. Which one do you like?", new Set(), { knownDates: dates });
        assert.deepEqual(result.reasons, ["ungrounded_date"]);
        assert.equal(result.text, "Here are three studios for this Sunday for 3 hours. Which one do you like?");
    });

    it("drops a sentence whose date nothing supplied", () => {
        const result = checkReply("It is free on 22 March. Shall I price it?", new Set(), { knownDates: dates });
        assert.ok(!result.text.includes("22 March"));
        assert.ok(result.text.includes("Shall I price it?"));
    });

    it("leaves dates from the context, tools or the customer alone", () => {
        for (const reply of ["It's free on Sun, 15 Nov.", "Nov 14 works too.", "For January 3rd I'd check again closer to the day."]) {
            assert.equal(checkReply(reply, new Set(), { knownDates: dates }).changed, false, reply);
        }
    });

    it("does not mistake other numbers for dates", () => {
        const reply = "It fits 12 people, may suit you, and is 4 hours long.";
        assert.equal(checkReply(reply, new Set(), { knownDates: dates }).changed, false);
    });
});
