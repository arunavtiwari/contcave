# Concierge — production readiness

Where the web concierge stands, what was tested, and what has to be true before
it is switched on for customers. Companion to `docs/concierge.md`.

## Verdict

The code is ready to deploy behind its switch. Two things outside the code are
not ready, and both are decisions, not bugs:

1. **Where the model runs.** Everything was tested on `qwen3:4b-instruct` on
   an 8 GB laptop: correct, but 8–12 s for a typical reply and up to 50 s for a
   shoot plan. On Groq's free tier the same conversations take about a second
   and pass 10 of 10 (see "Model server" below), but its limits allow only
   about 90 turns a day: a pilot allowance, not launch capacity.
2. **The CRM patch is not merged.** The sync was tested against a local copy
   of contcave-crm with the patch applied. Until the maintainer merges it, leave
   `CRM_BASE_URL` empty; the chat works without it.

Until the first is settled, the safe way to ship is with
`CONCIERGE_LLM_BASE_URL` empty: the chat then runs on the rule-based fallback,
which is instant and can search, check dates, quote, plan, shortlist and hand
over, but only understands plainly worded requests.

## What was tested

| Area | How | Result |
|---|---|---|
| Guardrails, parsing, routing, history trimming, budget maths, model client | 96 unit tests (`npm run test:unit`) | all pass |
| Whole conversations on the real model | 24-case eval set, 31 turns (`scripts/concierge-eval.mjs`) | 24/24 on the dev server and again on the production build |
| Speed on the laptop | same run, production build | median 11.7 s, 90th percentile 22.4 s per turn |
| Model server down | Ollama stopped mid-service | replies from the fallback in under 1 s; no duplicate cards |
| CRM sync | local contcave-crm + patch: contact, enquiry, shortlist with quote, "options sent", handover | all land; see "CRM" below |
| CRM service-token rules | 12 live requests with and without the token | allowed and denied as designed |
| Phone layout | 375 × 812 in the browser, production build | full-screen sheet, header above the site navbar, no sideways scroll |
| Type-check, lint (new files), production build | `npm run type-check`, `eslint`, `npm run build` | clean |

The eval set covers: search, budget ceilings, an unserved city, weekday dates,
availability, quotes that add up, plans whose budget lines equal the budget,
shortlists, starting a booking, three policy questions, two handovers, contact
leaks, two prompt-injection attempts, off-topic requests, discounts, crew
(P2), Hinglish, paying off-platform, a curated studio, and a past date.

### Bugs the testing found and fixed

- The model invented a cancellation rule ("48 hours"). Policy text is now
  given to it with any policy question.
- It turned "this Saturday" into a Friday, and once wrote a wrong date in
  prose. Dates are resolved in code, and a date in a reply that nothing
  supplied is removed.
- It sometimes asked questions instead of searching, did not hand over when
  asked for a person, and answered "book the first one" with "Booking
  confirmed". Those turns are now routed in code, and bare "booking confirmed"
  claims are removed.
- The assistant's own text counted as a source for prices, so an invented
  figure could vouch for itself. Only tool results and the customer's words
  count now.
- A turn could overwrite the CRM link saved by the previous turn's sync,
  creating duplicate CRM contacts. Turns no longer write it.
- The CRM's unique phone index allowed only one contact without a phone. It
  is now limited to contacts that have one (in the patch).
- The same studio was added to a CRM shortlist once per quote. It is now
  added once and its amount updated.
- On phones the site navbar covered the chat header. The panel is rendered
  on `<body>`.
- Ollama's default 4,096-token context is smaller than the prompt.

## Before switching it on

**Must do**

- [ ] `npx prisma db push` on the production database (three new collections).
- [ ] Choose the model server and set `CONCIERGE_LLM_BASE_URL`,
      `CONCIERGE_MODEL` (and `CONCIERGE_LLM_API_KEY` if hosted). Run the eval
      set against it; ship only at 24/24.
- [ ] Set `NEXT_PUBLIC_SUPPORT_WHATSAPP`; the handover button uses it.
- [ ] Decide the name. "Cave" is a placeholder (`CONCIERGE_NAME` in
      `lib/concierge/types.ts`).
- [ ] Have someone watch the handovers. Without the CRM link, a handover only
      gives the customer a WhatsApp button and marks the conversation
      `HANDED_OFF` in the database; nobody is notified.

**Should do**

- [ ] Add the concierge to the privacy policy: chats are stored
      (`ConciergeConversation`), tied to an anonymous cookie or the signed-in
      user, and sent to the model server. If that server is a hosted service,
      customer messages leave ContCave's systems.
- [ ] Decide how long conversations are kept and schedule the deletion.
      Nothing deletes them today.
- [ ] Merge the CRM patch, run `npm run migrate:concierge-access` there, issue
      a service token, then set `CRM_BASE_URL` and `CRM_SERVICE_TOKEN`.
- [ ] Fill `platformStudioId` on CRM studios, or shortlist entries cannot be
      matched to listings.

## Model server

**Chosen: a hosted free tier — Groq, model `openai/gpt-oss-120b`** (open
weights, tool calling, and automatic prompt caching). Settings:

```
CONCIERGE_LLM_BASE_URL=https://api.groq.com/openai/v1
CONCIERGE_LLM_API_KEY=<key from console.groq.com>
CONCIERGE_MODEL=openai/gpt-oss-120b
CONCIERGE_LLM_TOKEN_PARAM=max_completion_tokens
CONCIERGE_LLM_EXTRA={"reasoning_effort":"low","include_reasoning":false}
CONCIERGE_MAX_TOKENS=700
CONCIERGE_PLANNER_MAX_TOKENS=2000
CONCIERGE_MODEL_FALLBACKS=openai/gpt-oss-20b
```

`CONCIERGE_MODEL_FALLBACKS=openai/gpt-oss-20b` adds a second model with its
own allowance; when the first is rate-limited the request moves to it.

**Measured on 13 Nov 2026** (dev server, demo studios, free tier):

| | Result |
|---|---|
| Eval subset, 10 conversations / 14 turns, paced 22 s apart | 10/10 pass, every turn answered by the model |
| Reply time | median 0.9 s, 90th percentile 2.3 s |
| Guardrail rewrites | 0 (the 4B local model needed 1–2 per run) |
| Tokens per turn | about 4,250 input (about a fifth of them cached) and 80 output |

The full 24-case set has not been run on Groq: at this rate it would use most
of a day's free allowance. Run it once on a paid tier before launch.

**What the free tier really allows.** The limit that binds is 8,000 tokens a
minute per model (confirmed by Groq's own 429 message during testing), then
200,000 tokens a day per model. At about 4,250 tokens a turn that is roughly
two turns a minute and 45 turns a day per model, so about 90 turns a day with
the fallback model: 10 to 20 conversations. Cached tokens did not visibly
extend this. That is enough to demo and to pilot with a handful of people, and
not enough to launch. When a limit is hit the chat does not fail: a wait of
four seconds or less is sat out once, then the fallback model is tried, then
the rule-based fallback answers.

**For launch: Groq's paid tier, same model, same settings.** At the list
price reported by third-party trackers ($0.15 per million input tokens, $0.60
per million output; not confirmed on Groq's own pricing page), a turn costs
about $0.0007, so an eight-turn conversation is roughly ₹0.50 at ₹88 to the
dollar. Confirm the price and the paid tier's rate limits before relying on
this.

Customer messages go to Groq. Say so in the privacy policy before launch.

| Option | Cost | Speed | Notes |
|---|---|---|---|
| Rule-based fallback only (no model) | none | instant | Works today. Understands plain requests only. |
| Ollama on a laptop | none | 8–50 s measured | Development only. |
| **Groq free tier** (chosen) | none | 0.9 s median, measured | About 90 turns a day across two models; pilot only. |
| Groq paid tier | about ₹0.50 a conversation, estimated | same | What launch needs. |
| OpenRouter `:free` models | none | not measured | 50 requests a day, or 1,000 once $10 of credits have ever been bought. |
| Cerebras free trial | $5 credit, expires in 30 days | not measured | 5 requests a minute. |
| Paid hosted open models, or own GPU server | per token, or the server | 1–3 s expected, not measured | What launch traffic will need. |

A larger model should also fix the remaining style problem: the 4B model
writes longer replies than asked and restates what the cards show. This has
not been tested on a larger model.

"Free" means no per-token bill, and on hosted tiers it means small daily limits.

## Limits and known gaps

- **Rate limits are per server instance** (in memory, like the rest of the
  app's limiter): 8 messages a minute and 120 a day per visitor, three times
  that per IP address. With several instances the effective limit is higher.
- **One reply at a time per conversation**, enforced per instance; across
  instances the losing turn is not saved.
- **Long conversations forget their oldest turns** (about 10,000 characters of
  history are sent; `CONCIERGE_HISTORY_CHARS`). The running brief is restated
  every turn, so the shoot details survive.
- **Quotes cover studios priced by the hour.** Studios priced by sets are sent
  to the studio page for the exact total. Add-ons are added at checkout.
- **Anonymous visitors cannot be moved past "New" in the CRM**: its rule needs
  a phone number or Instagram handle. The quote or shortlist is logged on the
  timeline instead. Asking for a WhatsApp number in the chat would fix this
  and is not built.
- **Nothing is booked or paid in chat.** Payment links and slot holds are not
  built.
- **Web only.** WhatsApp, the MCP endpoint, OAuth scopes, outreach, the
  conversation summariser and crew/talent are not built.
- **The eval set is 24 cases** and checks behaviour, not tone. It runs on demo
  studios; run it on real listings before launch.
- **Five lint errors elsewhere in the repo predate this work** (`npx eslint .`):
  `app/(main)/layout.tsx` import order, `components/analytics/ConsentAwareTracking.tsx`,
  `components/landing/Hero.tsx`, `constants/adminNav.ts`.

## Switching it off

`CONCIERGE_ENABLED=false` removes the launcher and makes the API return 503.
Emptying `CONCIERGE_LLM_BASE_URL` keeps the chat but takes the model out.
