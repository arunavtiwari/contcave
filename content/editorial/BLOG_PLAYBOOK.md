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

## Cadence

- **3 posts per week: Monday, Wednesday, Friday** (published ~9:30 AM IST).
- One post per publishing run. Pick the next topic from
  `content/editorial/TOPIC_BACKLOG.md` (see "Topic selection" below).

## Topic selection

1. Open `content/editorial/TOPIC_BACKLOG.md` and take the **first topic in the
   Queue** section.
2. Skip a topic if it is already covered by:
   - an existing file in `content/posts/`, or
   - an open pull request whose title starts with `blog:`.
3. Before writing, spend a few minutes validating the angle (web search if
   available): confirm the primary keyword is how people actually phrase the query
   in India, and pull 2–4 "People also ask"-style questions for the FAQ section.
4. After publishing, move the topic from **Queue** to **Published** in the backlog
   file (add date + slug) in the same commit as the post.

## File format

Posts are JSON files in `content/posts/<slug>.json`, rendered by
`app/(main)/(public)/blog/[id]/page.tsx` and typed by `types/blog.ts`.

Rules:

- **Filename = `id` = `slug`.** Kebab-case, keyword-first, no year in the slug
  unless the year is part of the keyword (e.g. `podcast-studio-rental-delhi-ncr`).
- **No images.** Omit `meta.image` entirely and never use `"blockType": "image"`.
  The UI and OG tags fall back gracefully (`OG_IMAGE` default).
- `publishedAt` / `createdAt` / `updatedAt`: today's date as an ISO timestamp,
  e.g. `"2026-07-06T04:00:00Z"`.
- `_status`: `"published"`, `enablePremiumContent`: `false`, `premiumContent`: `[]`.
- `authors`: `["ContCave Editorial"]`,
  `populatedAuthors`: `[{ "id": "author-cc-edit", "name": "ContCave Editorial" }]`.
- `categories`: exactly one, from the fixed set below, with breadcrumbs shaped like
  existing posts (see any file in `content/posts/` for the shape).

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
   Use secondary keywords naturally in H2s. Prefer concrete, India-specific
   detail: ₹ price ranges, city areas, hourly-slot math, realistic shot counts.
4. **At least one `quote` block** — a stat, rule of thumb, or pro tip.
5. **FAQ section** — a heading `"FAQs: <topic>"` followed by 3–5 question
   headings, each answered in 1–2 short paragraphs. Source questions from real
   search queries ("People also ask").
6. **"Why book with ContCave" or equivalent CTA section** — one short section
   tying the topic back to what ContCave does (compare studios, transparent
   hourly pricing, instant booking). Plain text only — the renderer does not
   support inline links, so name ContCave rather than linking.
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
- **Honesty rule**: never invent named studios, fake statistics, or fake reviews.
  Price ranges and stats must be conservative, clearly framed as typical ranges.
  When citing a trend, phrase it as an observable pattern, not a fabricated study.

## Validation before publishing

```bash
node -e "JSON.parse(require('fs').readFileSync('content/posts/<slug>.json','utf8'))"
npm run type-check
```

Both must pass. Also confirm the new file appears via
`node -e "const{getSortedPostsData}=require('./lib/posts');..."` is unnecessary —
JSON parse + type-check is sufficient since posts are read dynamically.

## Publishing flow (automated routine)

1. Create/checkout the session's working branch.
2. Add the post JSON + updated `TOPIC_BACKLOG.md` in one commit:
   `blog: <post title>`.
3. Push the branch and open a pull request to the default branch (`staging`)
   titled `blog: <post title>`, with a body summarizing the topic, primary
   keyword, and tag count.
4. Do not merge the PR yourself unless explicitly authorized.
