# Concierge — ContCave's AI booking assistant

"Spot" is the chat on the public site that helps a customer find a studio,
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

## Model

Spot runs on **Claude** through the official Anthropic SDK (`@anthropic-ai/sdk`), using
`ANTHROPIC_API_KEY`, the same key and the same shared client as AI search (`lib/ai/claude.ts`).
The model is `CLAUDE_MODEL` there (Claude Haiku 5.5, effort `low`); change it in that one place
to move every AI feature. The chat is hidden when the key is not set.

- It is a standard tool-calling agent. Claude decides which tools to call. The runtime runs them,
  sends the results back and streams the reply (`lib/concierge/model.ts`). There is no keyword
  routing and no rule-based reply path.
- The SDK retries 429, 5xx and connection errors with backoff. A reply that sends nothing for
  `CONCIERGE_FIRST_CHUNK_MS` is abandoned.
- Spot keeps its own provider-neutral transcript and converts it per request. Thinking blocks are
  never replayed: Spot trims old turns to `CONCIERGE_HISTORY_CHARS`, and replaying thinking next to
  an edited history is rejected, while dropping all of it is always valid.
- The long system prompt is prompt-cached.
- Shoot plans use Claude structured output shaped by the plan's Zod schema; the reply is then
  validated with that schema. If the call fails or the reply is invalid, Spot says it
  couldn't draft the plan and offers to try again or hand over; there is no template plan.
- No embeddings are used.
- If the reply still fails, Spot points to the studios the search already found, or asks the
  customer to try again or use WhatsApp.

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
| Eval set (24 conversations, 31 turns) | `node scripts/concierge-eval.mjs <site url>` | 22/24 on Gemini 3.5 Flash Lite (2026-11-18, before the move to Claude; re-run on Claude); the 2 misses are data-dependent: first studio set-priced (quote) or curated (start-booking), where Spot correctly offers the studio page or a handover |
| Type-check, lint | `npm run type-check`, `npx eslint lib/concierge components/concierge app/api/concierge tests/unit` | clean |
| Production build | `npm run build` | passes |

Run the unit tests and the eval set before shipping any change to prompts,
tools, guardrails or the model. The eval set needs studios in Delhi
and Mumbai in the database it runs against; cases live in
`evals/concierge/cases.json`.

## Files

| File | What it holds |
|---|---|
| `lib/concierge/prompts.ts` | All prompts: core, web, WhatsApp, host, planner |
| `lib/concierge/tools.ts` | Tool definitions and handlers |
| `lib/concierge/runtime.ts` | The turn loop |
| `lib/concierge/history.ts` | How much history is sent to the model |
| `lib/concierge/toolSpecs.ts` | Tool definitions as the model sees them |
| `lib/concierge/model.ts` | Claude adapter: transcript conversion and streaming |
| `lib/concierge/guardrails.ts` | Input cleaning, masking, grounding, reply check |
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
