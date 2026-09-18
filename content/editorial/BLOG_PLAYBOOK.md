# ContCave Blog Playbook

This is the single source of truth for writing and publishing ContCave blog posts.
It is written to be executed by an automated editorial routine (or a human) with no
extra context. Follow it exactly.

## What ContCave is (write for this)

ContCave is a studio booking marketplace for India — hosts list creative studios
(photography, video, podcast, events), guests discover and book them, starting with
Delhi NCR. Every post must be genuinely useful to one of these readers:

1. **Creators & freelancers** — influencers, YouTubers, podcasters, photographers
   who rent studios by the hour.
2. **Brands & D2C teams** — marketing teams booking product, fashion, or ad shoots.
3. **Hosts / studio owners** — people who own creative spaces and want bookings.

A post earns its place only if a reader finishes it knowing exactly what to do next.
No filler, no generic "content marketing" prose.

## Voice & stance

You are not a photographer, and you don't write as one. You are also not
ContCave's founder — don't write in a founder's first-person voice unless a specific
post is explicitly bylined to them by name, with their approval.

The voice is: **the person who actually called the studios.** You called the
owners, asked what the ceiling height is, found out the good light stops at
2pm, learned which places have parking and which ones make you carry a
C-stand up three flights. That is the entire source of authority for this
blog, and it is enough on its own — no post needs to reach for anything
grander than that.

What this means in practice:

- **Write about rooms, not about photography.** Never advise a reader on
  lighting technique, lens choice, exposure, or how to direct a model or
  subject. A working photographer reads one sentence of that and closes the
  tab. Write about what's physically in the room, what it costs, when to use
  it, and how to get gear into and out of it.
- **"I called and asked" is the strongest sentence available.** Use it.
  "The listed rate is ₹X, but the base room is ₹Y — lights are extra" beats
  three paragraphs of adjectives, and no competitor page has it because
  they're aggregating from Instagram instead of calling anyone.
- **When you don't know something, say so — never fabricate a plausible
  number.** If a post needs a ceiling height, a rate, a parking answer, or a
  timing detail that hasn't been verified, insert a placeholder in the draft:
  `[NEED: ceiling height for <studio/listing>]`. Flag every `[NEED: ...]` in
  the PR description. One invented spec that a reader catches costs the
  reader and the studio relationship — never guess to fill a gap.
- **ContCave belongs in the post as a fact, not a pitch.** Don't bolt on a
  "Why Book with ContCave" section that could be pasted onto any studio-rental
  blog on earth. Mention ContCave only where it's the actual answer to
  something the post just raised — e.g. naming it as where to compare the
  specific rooms just discussed, or as the source of a rate/availability
  detail — and only when there is real inventory to point to. If there isn't
  enough real inventory for a topic to link anywhere useful, the topic
  doesn't belong in the queue (see "Topic selection" below).

### Banned words and phrases

Never use: *game-changer, seamless, one-stop, elevate, unlock, curated
experience, dive into, delve, in today's fast-paced world, look no further,
revolutionise/revolutionize, transform your, the perfect, whether you're a
... or a ..., it's important to note, boasts, nestled, plethora.*

If a sentence needs one of these to work, the sentence has nothing in it.
Cut it and write the fact instead.

**The test:** would a photographer who has booked forty studios roll their
eyes at this sentence? If yes, it's out. Read the full draft against this
test before it ships.

## Cadence

- **3 posts per week: Monday, Wednesday, Friday** (published ~9:30 AM IST).
- One post per publishing run.

## Topic selection

Topics are no longer picked autonomously from a raw brainstorm list. The
backlog file (`content/editorial/TOPIC_BACKLOG.md`) has two sections:

- **Approved Queue** — topics that have been reviewed and explicitly approved
  by the ContCave team, with the verified data (or `[NEED: ...]` gaps) already
  attached. The automated routine may only pick from here, in order.
- **Proposed — needs approval** — candidate topics awaiting sign-off. The
  automated routine must never write from this section. Move a topic to the
  Approved Queue only after the team has said yes.

Every topic, before it can move into the Approved Queue, must clear three
bars:

1. **It maps to a query someone actually types.** Evidence is a real SERP
   observation or search-behavior signal (e.g. "People also ask" questions,
   autocomplete, competitor pages ranking for the exact phrase) — not a
   hunch. Cite what was checked.
2. **It can link to real ContCave inventory.** State how many active listings
   it can point to and where that count came from. A topic with nowhere to
   send the reader doesn't go in the queue, however good the keyword looks.
3. **It contains at least one number that can be verified** — a rate, a
   ceiling height, an opening/closing time, a metro/parking distance. Generic
   advice with no verifiable specific ranks for nothing; a thousand identical
   pages already exist for it.

Checklist- and etiquette-style topics ("10 things to bring to a shoot",
"studio rules every renter should know") are explicitly out — they compete
with every generic blog on the internet and convert nobody. Prefer a matrix
of **studio type × city/micro-market × use case** (e.g. "cyclorama studios in
Gurugram," "daylight studios for lookbook shoots in South Delhi," "where to
record a podcast near Cyber Hub," "pre-wedding shoot locations in Noida under
₹15,000") over broad city-level or generic-advice topics that are already
covered.

Selection steps once a topic is in the Approved Queue:

1. Take the first Approved Queue topic not already covered by a file in
   `content/posts/` or an open PR titled `blog: ...`.
2. Re-verify the query phrasing and pull 2–4 real "People also ask"-style
   questions for the FAQ section (a few minutes of web search).
3. After publishing, move the topic from Approved Queue to Published (date +
   slug) in the same commit as the post.

## File format

Posts are JSON files in `content/posts/<slug>.json`, rendered by
`app/(main)/(public)/blog/[id]/page.tsx` and typed by `types/blog.ts`.

Rules:

- **Filename = `id` = `slug`.** Kebab-case, keyword-first, no year in the slug
  unless the year is part of the keyword (e.g. `podcast-studio-rental-delhi-ncr`).
- **No images.** Omit `meta.image` entirely and never use `"blockType": "image"`.
  The blog card and post banner automatically render a gradient cover
  (`lib/blogGradient.ts`, seeded from the post `id`) whenever `meta.image` is
  absent — this is a site feature, not something the routine generates or
  writes into the post JSON. OG/social share tags still fall back to the
  static `OG_IMAGE` default (dynamic OG gradients are not implemented).
- `publishedAt` / `createdAt` / `updatedAt`: today's date as an ISO timestamp,
  e.g. `"2026-07-06T04:00:00Z"`.
- `_status`: `"published"`, `enablePremiumContent`: `false`, `premiumContent`: `[]`.
- `authors`: `["ContCave Editorial"]`,
  `populatedAuthors`: `[{ "id": "author-cc-edit", "name": "ContCave Editorial" }]`,
  unless the post is explicitly bylined to a named person with their approval.
- `categories`: exactly one, from the fixed set below, with breadcrumbs shaped like
  existing posts (see any file in `content/posts/` for the shape).
- **Never invent new ids.** The only new identifier a post introduces is its own
  `id`/`slug`. Every other id must be reused from the fixed sets already defined
  here: category `id` (one of the five below), author id (`author-cc-edit`),
  breadcrumb ids (`bc-home`, `bc-blogs`, `bc-<category-id>`). Block ids follow the
  existing naming convention (`h-`, `p-`, `list-`, …) but are scoped to one post,
  so reusing the pattern (not the literal string) from another post is fine.

### Categories (fixed set — do not invent new ones)

| id | title | use for |
|---|---|---|
| `studio-guides` | Studio Guides | city/area/type studio roundups & discovery |
| `booking-tips` | Booking Tips | how to book, checklists, pricing, negotiation |
| `content-creation` | Content Creation | shoot planning, reels/YouTube/podcast craft |
| `creator-economy` | Creator Economy | industry trends, brand/creator business |
| `host-guides` | Host Guides | listing, earning, and running a studio |

### Layout blocks

Allowed `blockType` values: `heading`, `paragraph`, `list`, `quote`.
Block `id`s must be unique within the post (`h-intro`, `p-intro`, `list-x`, …).

## Content structure (every post)

1. **H1 heading block** — same as the title.
2. **Intro paragraph** — state the reader's problem and what the post delivers,
   with the primary keyword in the first 100 words.
3. **4–7 H2 sections** — each a `heading` block followed by paragraphs/lists.
   Every section is about the room and the logistics of using it (space,
   equipment on site, access, timing, cost), never about photography
   technique. Prefer concrete, India-specific detail: ₹ price ranges, city
   micro-markets, hourly-slot math, metro/parking distance — and mark
   anything unverified with `[NEED: ...]` rather than inventing it.
4. **At least one `quote` block** — a verified fact or direct answer from an
   actual call to a studio/host, not a generic "rule of thumb." If nothing
   verified is available yet, mark it `[NEED: verified quote/stat]`.
5. **FAQ section** — a heading `"FAQs: <topic>"` followed by 3–5 question
   headings, each answered in 1–2 short paragraphs. Source questions from real
   search queries ("People also ask").
6. **ContCave mention** — one or two sentences, placed wherever it's the
   natural answer to something the post just raised (not a separate bolted-on
   "Why Book with ContCave" section with marketing language). Name ContCave
   rather than linking — the renderer doesn't support inline links.
7. **Final takeaways** — a short paragraph + a 3–5 item action list.

Target length: **1,200–1,800 words** across all blocks. Long enough to rank,
short enough to stay useful.

## SEO requirements

- **Title** (`title` and `meta.title`): ≤ 65 characters, primary keyword first
  or near-first, current year when the query is time-sensitive
  (e.g. "Podcast Studio Rental in Delhi NCR: 2026 Price & Booking Guide").
- **Meta description** (`meta.description`): 140–155 characters, includes the
  primary keyword and a reason to click; mention ContCave.
- **Hero richText**: 1–2 sentence summary (this is the post's standfirst).
- **Tags** (`tags`): **20–30 keywords**, ordered from head terms to long-tail:
  - primary keyword + close variants ("podcast studio delhi", "podcast studio
    rental delhi ncr", "podcast recording studio near me"),
  - city/area modifiers (Delhi, Noida, Gurugram, South Delhi, India),
  - intent modifiers ("price", "cost", "hourly", "book", "near me", "2026"),
  - audience terms ("for youtubers", "for brands", "for creators"),
  - always include `ContCave` as the final tag.
  - lowercase except proper nouns; no duplicates; no tag stuffing beyond 30.
  Tags are rendered as a "Related Topics" section at the end of the article and
  emitted as `keywords` metadata + Article JSON-LD, so they must read naturally.
- **Honesty rule**: never invent named studios, fake statistics, or fake
  reviews. Every rate, dimension, or timing claim is either verified (say how)
  or marked `[NEED: ...]` — never a plausible-sounding guess. When citing a
  trend, phrase it as an observable pattern, not a fabricated study.

## Validation before publishing

```bash
node -e "JSON.parse(require('fs').readFileSync('content/posts/<slug>.json','utf8'))"
npm run type-check
```

Both must pass. Also grep the draft against the banned-words list above and
against the voice test ("would a photographer who's booked forty studios roll
their eyes at this sentence?") before committing. Also confirm the new file
appears via `node -e "const{getSortedPostsData}=require('./lib/posts');..."`
is unnecessary — JSON parse + type-check is sufficient since posts are read
dynamically.

## Publishing flow (automated routine)

Use a single, persistent branch for all scheduled posts — `regular-blog-update`.
Do **not** create a new branch per post; that produces a pile of one-post
branches/PRs that never get cleaned up. Instead, each run adds one more commit
to the same branch/PR until someone merges it.

1. `git fetch origin staging`.
2. Sync the shared branch with the latest `staging`:
   - `git fetch origin regular-blog-update` (check
     `git ls-remote --heads origin regular-blog-update` first).
   - If it exists on `origin`: check it out tracking the remote branch, then
     merge `origin/staging` into it (`git merge origin/staging --no-edit`).
     This should be conflict-free since the branch only ever gains new post
     files and backlog-file edits.
   - If it does not exist yet (first run, or the previous PR was merged and
     GitHub auto-deleted the branch): create it fresh —
     `git checkout -b regular-blog-update origin/staging`.
3. Add the post JSON + updated `TOPIC_BACKLOG.md` in one commit:
   `blog: <post title>`.
4. Push: `git push origin regular-blog-update`.
5. Check for an existing **open** PR from this branch into `staging`
   (`gh pr list --head regular-blog-update --base staging --state open`).
   - If one is open, you're done — the new commit is already part of it. A
     short PR comment noting the newly added post is a nice-to-have.
   - If none is open (first run, or the last one was merged/closed), open a
     new PR titled `blog: <post title>` with a body summarizing the topic,
     primary keyword, tag count, and any `[NEED: ...]` gaps still open.
6. Do not merge the PR yourself unless explicitly authorized.
7. If the Approved Queue is empty, stop and report that rather than writing
   from the Proposed section or inventing a topic.

Note: this branch strategy applies only to the recurring post routine. One-off
infra/editorial changes (like updates to this playbook itself) should still use
their own short-lived branch as normal.

## Backward pass (existing posts)

Existing posts are re-evaluated using Search Console data (last 90 days per
URL: impressions, clicks, average position), bucketed as:

- **Impressions and clicks** — leave the structure alone; only add
  specificity (real rates, real specs, links to actual listings) where it's
  missing.
- **Impressions, no clicks** — rewrite fully in the voice above. The query is
  there; the page isn't earning it.
- **No impressions after 90 days** — don't rewrite. Delete the post or merge
  its content into a stronger page. A rewritten post nobody searches for is
  still a post nobody searches for.

This pass needs a human to supply the Search Console export — it is not
something the automated routine can run on its own.
