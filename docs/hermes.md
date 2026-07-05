# Hermes — ContCave production agent

Shoot-production planning on top of the marketplace: brands submit briefs,
producers compose **studio (Listing) + crew + talent** plans with itemised
quotes, and communication with brands runs over WhatsApp through an
open-source connector. Built to the "ContCave Production Agent — Technical
Build Specification"; currently at **Phase 0** (data + human workflow; the AI
pipeline in `lib/hermes/agent/` is stubbed for Phases 1–2).

## How it maps onto the existing app

| Spec concept | In this codebase |
|---|---|
| Studio | Existing `Listing` (plans store `listingId`); Phase 1 embeddings live in `ListingCreativeProfile` so the hot model stays untouched |
| Studio availability | Existing `DayStatus` / `ListingBlock` |
| Crew / Talent / Brand / Brief / Plan / Shoot | New models: `Crew`, `Talent`, `ClientBrand`, `Brief`, `ProductionPlan`, `Shoot`, `ProductionAvailability` |
| Producer | `role === ADMIN` (admin panel, `/admin/dashboard/production`) |
| Mutations | Server Actions via `createAction` (`app/actions/productionActions.ts`) |
| Reads | `app/actions/getProductionData.ts` |
| Zod schemas | `schemas/production.ts` |
| Vector search | `lib/hermes/vector.ts` — `$vectorSearch` via `prisma.$runCommandRaw`, no extra driver dependency |
| Money | Integer INR, same as `Listing.price` |

## The Phase 0 loop

1. **Admin → Brands**: create a `ClientBrand` (add a WhatsApp phone!) — mints a
   tokenised intake link `/submit/<token>`.
2. Brand fills the brief (deliverables, moodboard upload to R2, budget, city,
   dates) — appears under **Admin → Briefs**.
3. Open the brief → **Build plan**: pick a Listing + crew + talent (filtered to
   the brief's city), shot list, schedule. Live fee/budget check
   (`CONTCAVE_FEE_PCT`, default 15).
4. Open the plan → **Generate quote** → **Send quote on WhatsApp** (via the
   Hermes connector; message is logged in `WhatsAppMessage`).
5. After the shoot: **Shoots → Log shoot** — actuals + punctuality update every
   participant's reliability (`shootsCompleted`, `onTimePct`, `avgRating`).

## WhatsApp (open-source connector)

`scripts/hermes-whatsapp-connector.ts` is a standalone Baileys (WhatsApp Web)
bridge — **no Business API / BSP fees**:

```bash
HERMES_WA_SHARED_SECRET=<same-as-app> npx tsx scripts/hermes-whatsapp-connector.ts
# first run prints a QR — scan with the ContCave WhatsApp number (Linked devices)
```

- Inbound messages → `POST /api/hermes/whatsapp/inbound` → logged in
  `WhatsAppMessage`, matched to a `ClientBrand` by phone.
- Outbound (quote sends) → app calls the connector's local `/send` endpoint
  (`lib/hermes/whatsapp.ts`).
- Both directions authenticate with `HERMES_WA_SHARED_SECRET`.

> ⚠️ Baileys automates WhatsApp Web, which is against WhatsApp's ToS — numbers
> can get banned. Use a dedicated number, keep volume low and conversational,
> and swap to the Meta Cloud API (the existing `/api/whatsapp/webhook` handler)
> when volume justifies it. The app-side contract does not change.

## Env vars (add to `.env`)

```
CONTCAVE_FEE_PCT=15
HERMES_WA_SHARED_SECRET=      # openssl rand -hex 24; shared app <-> connector
HERMES_WA_CONNECTOR_URL=http://127.0.0.1:8790
HERMES_APP_URL=http://localhost:3000   # connector -> app (inbound bridge)

# Phase 1+ (unused today)
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL_REASONING=claude-fable-5
ANTHROPIC_MODEL_UTILITY=claude-haiku-4-5-20251001
EMBEDDINGS_API_KEY=
EMBEDDINGS_MODEL=voyage-3
```

## Scripts

```bash
npm run hermes:wa        # start the WhatsApp connector (QR on first run)
npm run hermes:indexes   # create Atlas Vector Search indexes (M10+; Phase 1)
npx prisma db push       # sync the new collections after pulling this branch
```

## Phase roadmap (spec §9)

- **Phase 0 (this)** — data model, admin workflow, intake, WhatsApp comms.
- **Phase 1** — `lib/hermes/agent/fingerprint.ts` (multimodal fingerprints on
  moodboards/portfolios), embeddings, `retrieve.ts` ranked candidates in the
  brief view.
- **Phase 2** — `compose.ts` full agent-drafted plans (`source: AGENT`),
  producer edit-distance as the iteration metric.
- **Non-goals for now** — payments/escrow for shoots, crew self-serve portals,
  calendar sync, auto-booking. Humans stay in the loop for booking and money.
