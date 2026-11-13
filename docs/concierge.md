# Concierge — ContCave's AI booking assistant

"Cave" is the chat on the public site that helps a customer find a studio,
check a date, get an exact price, plan the shoot day, share a shortlist and
start a booking. Web chat is built; WhatsApp is next. The full design is in
the PRD ("ContCave AI Concierge: PRD and Research").

## What it can and cannot do

| Can | Cannot (by design) |
|---|---|
| Search studios by city, shoot type, look, date, budget, people | Take payment in the chat |
| Show a studio's details | Create, change or cancel a booking |
| Check live availability for a date | Give discounts or promise refunds |
| Quote a slot exactly, with GST | Share a studio's phone, email, address or handle |
| Draft a shoot plan (schedule, shots, checklist, budget split) | Recommend or price crew and talent (P2) |
| Make a shareable shortlist page (`/shortlist/<token>`) | |
| Open the studio page to book and pay | |
| Answer policy questions from `lib/concierge/help.ts` | |
| Hand over to the team (WhatsApp button + CRM) | |

Payment and booking stay on the studio page, under the existing checkout and
all of its checks.

## How a turn runs

```
browser ── POST /api/concierge/chat ──> runtime.ts ──> model server (open model)
   ^            (NDJSON stream)            │  ^              │ tool calls
   │                                       v  │ results      v
   └── text, status, cards, brief ──── tools.ts ── Prisma (listings, availability, pricing)
                                           │
                                           └─ after the reply: crm.ts ──> contcave-crm API
```

1. `app/api/concierge/chat/route.ts` checks origin and rate limits, finds the
   visitor's conversation (httpOnly cookie) and streams events back.
2. `lib/concierge/runtime.ts` appends the message, calls the model with the
   fixed system prompt and tool list, runs the tools it asks for, and streams
   the reply. Up to six tool rounds per turn.
3. The finished reply goes through `guardrails.ts`. If anything was removed,
   the browser is told to replace the streamed text.
4. The conversation is saved; the CRM is updated after the response is sent.

## Models

The concierge runs on **open-source models** behind any OpenAI-compatible
endpoint (`lib/concierge/model.ts`, plain `fetch`, no SDK):

| Where | `CONCIERGE_LLM_BASE_URL` |
|---|---|
| Ollama on the same machine | `http://127.0.0.1:11434/v1` |
| llama.cpp server, vLLM, LM Studio | their `/v1` URL |
| Hosted open models (Groq, Together, OpenRouter) | their `/v1` URL, plus `CONCIERGE_LLM_API_KEY` |

- `CONCIERGE_MODEL` must support tool calling. Default `qwen3:4b-instruct`
  (2.5 GB, runs on a laptop). Use a larger model in production; small models
  follow the prompt less reliably.
- `CONCIERGE_PLANNER_MODEL` (optional) is used only to draft shoot plans.
- Ollama needs a version with tool support (0.3 or later; tested on 0.40.16).
- **Ollama's default context window (4,096 tokens) is too small**: the system
  prompt and tools alone are about 3,000. Start it with a larger one, and keep
  the model loaded between turns:
  `OLLAMA_CONTEXT_LENGTH=8192 OLLAMA_KEEP_ALIVE=30m ollama serve`
- Measured with `qwen3:4b-instruct` on an 8 GB M1 laptop: about 60 s for the
  first turn after the model loads, 10–25 s per turn after that, 55 s for a
  shoot plan. That is a development setup, not a production one.
- Three things are done in code so they don't depend on a small model:
  stated facts (city, date, hours, people, hourly budget) are saved to the
  brief by rule; the coming week's dates are spelled out in each message; and
  the matching policy text is handed to the model with any policy question.
- With no `CONCIERGE_LLM_BASE_URL`, or when the server is down or slow
  (`CONCIERGE_LLM_TIMEOUT_MS`, default 90 s), `fallback.ts` answers from
  keyword rules over the same tools, so the chat never goes dark.

"Free" means no per-token bill; the model still needs a machine to run on.
A laptop is fine for development. Production needs a server with a GPU, or a
hosted free tier, which is rate-limited.

## Decisions made in code, not by the model

`lib/concierge/router.ts` routes four kinds of turn before the model runs,
because a small model gets them wrong often enough to matter. The tool runs in
code and the model only writes the reply.

| The customer… | What runs |
|---|---|
| asks for a person, or reports a problem with a booking or payment | `handoff_to_human` |
| asks to book a studio that is on screen ("book the first one") | `start_booking`, or a handover if the studio is curated |
| asks for a plan, schedule or shot list | `draft_plan` |
| names a city and a kind of shoot for the first time | `search_studios` |

Everything else is the model's call. If the model server cannot be reached
after a routed tool has run, a fixed sentence describes the card on screen.

## Guardrails (in code, not just in the prompt)

- **Facts from tools only.** A rupee amount in a reply must be a number a
  tool returned or the customer wrote; other sentences are removed.
- **Dates from the conversation only.** A date written in a reply must be one
  from the context, a tool result or the customer; a wrong aside is cut and a
  sentence built on an invented date is removed.
- **No false confirmations.** "Your booking is confirmed", "payment received",
  "refund approved" are removed; no tool can do those things.
- **Contact masking.** Phone numbers, emails, chat links and handles are
  masked in listing text before the model sees it and in replies before the
  customer does, including when split across stream chunks.
- **Hidden markup.** `<think>` and `<tool_call>` text from open models is not
  shown.
- **Tool inputs are untrusted.** Every tool validates its arguments with Zod;
  who is asking comes from the session, never from the model.
- **Public listings only**: active, verified, not archived.
- **Limits.** 8 messages a minute and 120 a day per visitor and per IP
  (IP allowance is 3×), 40 turns per conversation, 3 plans per conversation.
- Same-origin POST only; the visitor cookie is httpOnly.

## Testing

| What | How | Last result |
|---|---|---|
| Unit tests (96) | `npm run test:unit` | all pass |
| Eval set (24 conversations, 31 turns) | `node scripts/concierge-eval.mjs <site url>` | 24/24 on the dev server and on the production build, `qwen3:4b-instruct` |
| Type-check, lint | `npm run type-check`, `npx eslint lib/concierge components/concierge app/api/concierge tests/unit` | clean |
| Production build | `npm run build` | passes |

Run the unit tests and the eval set before shipping any change to prompts,
tools, guardrails, the router or the model. The eval set needs studios in Delhi
and Mumbai in the database it runs against; cases live in
`evals/concierge/cases.json`. See `docs/concierge-production.md` for what is
and is not ready for production.

## Files

| File | What it holds |
|---|---|
| `lib/concierge/prompts.ts` | All eight prompts: core, web, WhatsApp, host, planner, CRM agent, summariser, output check |
| `lib/concierge/tools.ts` | Tool definitions and handlers |
| `lib/concierge/runtime.ts` | The turn loop |
| `lib/concierge/router.ts` | Turns decided in code before the model runs |
| `lib/concierge/parse.ts` | Rule-based reading of city, date, hours, people, budgets, start time |
| `lib/concierge/history.ts` | How much history is sent to the model |
| `lib/concierge/markup.ts` | Hides `<think>` / `<tool_call>` text |
| `lib/concierge/toolSpecs.ts` | Tool definitions as the model sees them |
| `lib/concierge/model.ts` | OpenAI-compatible client |
| `lib/concierge/guardrails.ts` | Input cleaning, masking, grounding, reply check |
| `lib/concierge/fallback.ts` | Rule-based replies with no model |
| `lib/concierge/planner.ts` | Shoot plan; budget arithmetic is done in code |
| `lib/concierge/help.ts` | Policy answers (keep in step with the public pages) |
| `lib/concierge/crm.ts` | Sync to contcave-crm (off unless `CRM_BASE_URL` and `CRM_SERVICE_TOKEN` are set) |
| `lib/concierge/store.ts` | Conversation persistence, tool-call log |
| `components/concierge/*` | Chat widget, cards, client hook |
| `app/(main)/(public)/shortlist/[token]` | Shortlist page |

## Data

Three collections (`prisma/schema.prisma`): `ConciergeConversation`,
`ConciergeShortlist`, `ConciergeToolCall`. Run `npx prisma db push` after
pulling this branch.

## Not built yet

WhatsApp channel (the prompt block exists; the gateway does not), payment
links and slot holds in chat, the eval set, the MCP server endpoint and OAuth
scopes, outreach plays, the conversation summariser job, and crew/talent (P2).
The CRM sync has been run end to end against a local copy of contcave-crm with
the service-access patch applied, not against the live CRM.
