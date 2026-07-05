# Hermes — growth playbook

The polished one-liner: **ContCave already rents the room; Hermes sells the
finished shoot.** A brand sends a moodboard and a budget on WhatsApp and gets
back a producer-reviewed plan — studio, photographer, MUA, model, shot list,
schedule — as one itemised quote. ContCave takes a fee (15%) on the whole
production, not just the room.

## Why this wins (the flywheel)

Every executed shoot writes back into the supply graph — who showed up on
time, what the brand rated them, what the work looked like (fingerprints).
That reliability + style data is the moat: competitors can copy the form, not
the graph. The loop:

```
brief in → plan out → shoot happens → reliability + fingerprints recorded
   ↑                                                        │
   └── better matches → faster quotes → more briefs ────────┘
```

Two structural advantages the marketplace already provides:

1. **Supply is seeded.** Verified listings ARE the studio graph — zero
   cold-start on the hardest side.
2. **Demand is warm.** Every brand that books a bare studio on contcave.com is
   a production lead ("want us to staff it?").

## The wedge (next 90 days)

**Target:** D2C brands in Delhi NCR doing monthly content (skincare, fashion,
F&B) with ₹50k–₹3L shoot budgets and no in-house producer. They already live
on WhatsApp — which is why intake and quotes run there.

**Motion — concierge first, agent behind the curtain:**

1. **Mine existing demand.** Every studio booking on the marketplace gets a
   WhatsApp follow-up: "Need crew or a model for that shoot? Send us your
   moodboard." (The booking data tells you the date, city, and studio
   already.) This is the cheapest channel and it's exclusive to ContCave.
2. **10-shoot pilot.** Hand-pick 10 brands, run their briefs through the
   dashboard end-to-end, charge the fee. Goal: prove ≥60% of Hermes'
   suggestions get used in shipped plans (the spec §11 Phase 1 bar) and a
   sub-24h brief→quote turnaround.
3. **Instagram supply-side loop.** Every shoot produces content; get tagged
   ("produced via ContCave") in exchange for a fee discount. Crew and models
   share it — supply markets the product to demand.

**Do not build yet:** payments/escrow for shoots, crew self-serve, or
auto-booking (spec §10). The concierge margin funds the learning.

## Metrics that matter (in priority order)

| Metric | Target | Where it lives |
|---|---|---|
| Brief → quote turnaround | < 24h | Brief.createdAt → Plan.quotedAt |
| Suggestion usability | ≥60% of shipped plans use a Hermes-suggested entity | Plan vs retrieval logs |
| Quote → booked rate | ≥30% | Brief status funnel |
| Fee per shoot / take rate | 15% holding | Shoot.contcaveFeeCollectedInr |
| Producer edit distance (Phase 2 gate) | shrinking | Plan.producerEdits |
| Repeat-brand rate | ≥40% in 90 days | Brief.brandId frequency |

Producer edit distance is the compounding one: every manual correction is
labelled training data for the Phase 2 composer.

## Ladder of automation (ship each rung only when the previous holds)

1. **Now (shipped):** intake + manual plan + quote + WhatsApp comms; Hermes
   suggests ranked candidates (Phase 1).
2. **Phase 2:** `POST plan/generate` — agent drafts the whole plan, producer
   edits. Gate: ≥70% schema-valid within-budget drafts (spec §11).
3. **Phase 3:** auto-approve within confidence/budget bands; WhatsApp-native
   brief parsing (inbound messages → structured Brief, the bridge endpoint
   already logs them); real calendar availability.

## Pricing posture

15% of subtotal now. As the graph deepens, the defensible move is a two-sided
take: keep ~10–12% from brands and add 3–5% from supply (crew/talent get
booked without doing sales — they'll pay it). Escrow/payments (Cashfree rails
already exist in this codebase) is the Phase 3 monetisation unlock, not now.

## Risks to watch

- **WhatsApp ban risk** (Baileys automates WhatsApp Web): dedicated number,
  low volume, human-sounding messages; migrate to Meta Cloud API at scale.
- **Producer bottleneck:** one producer caps throughput — the dashboard is
  built so a second producer is onboarding-free (ADMIN role).
- **Supply leakage** (brand goes direct to the photographer): the quote hides
  per-entity contact details until booking; reliability history + one-invoice
  convenience is the retention story.
- **Fingerprint costs:** one-time per asset by design (cache-respecting
  ingestion); moodboard fingerprints are the only recurring per-brief spend.
