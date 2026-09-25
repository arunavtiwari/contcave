#!/usr/bin/env node
// Low-token blog publishing helper for the scheduled blog routine.
//
//   node scripts/blog.mjs next                 # print the next backlog topic + draft format
//   node scripts/blog.mjs publish <draft.md>   # build content/posts/<slug>.json, validate, update backlog
//
// The model only writes a Markdown draft. Everything mechanical (ids, dates, authors,
// breadcrumbs, JSON shape, backlog bookkeeping, validation) happens here, with no
// dependencies, so the routine needs no `npm install` or type-check.

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const POSTS_DIR = path.join(ROOT, "content/posts");
const BACKLOG = path.join(ROOT, "content/editorial/TOPIC_BACKLOG.md");

const CATEGORIES = {
  "studio-guides": "Studio Guides",
  "booking-tips": "Booking Tips",
  "content-creation": "Content Creation",
  "creator-economy": "Creator Economy",
  "host-guides": "Host Guides",
};

const DRAFT_FORMAT = `Draft format (write to /tmp/draft.md, then run: node scripts/blog.mjs publish /tmp/draft.md)

---
topic: <backlog # from above>
slug: <kebab-case, keyword-first>
title: <= 65 chars, primary keyword first>
description: <140-155 chars, primary keyword, mentions ContCave>
summary: <1-2 sentence standfirst>
category: <studio-guides | booking-tips | content-creation | creator-economy | host-guides>
tags: <20-30 comma-separated, head -> long-tail; the script appends "ContCave">
---
# <H1, same as title>
<intro paragraph: primary keyword in first 100 words>
## <4-7 H2 sections: paragraphs, "- " bullet lists, "> " one quote min>
## FAQs: <topic>
### <3-5 questions, each answered in 1-2 short paragraphs>
## Why book with ContCave
## Final takeaways
<short paragraph, then a 3-5 item "- " action list>

Plain text only: no links, images, bold or tables. 1,200-1,800 words.
Never invent named studios, statistics, or reviews.`;

function fail(errors) {
  console.error("✗ Draft rejected:\n" + errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}

function readQueue() {
  const text = fs.readFileSync(BACKLOG, "utf8");
  const queue = text.split("## Published")[0];
  return queue
    .split("\n")
    .filter((l) => /^\|\s*\d+\s*\|/.test(l))
    .map((line) => {
      const [num, title, keyword, category, audience] = line.split("|").slice(1, -1).map((c) => c.trim());
      return { line, num: Number(num), title, keyword, category, audience };
    });
}

function cmdNext() {
  const queue = readQueue();
  const existing = fs.readdirSync(POSTS_DIR).map((f) => f.replace(/\.json$/, ""));
  if (!queue.length) {
    console.log("QUEUE EMPTY: append new topics to content/editorial/TOPIC_BACKLOG.md before publishing.");
    return;
  }
  const t = queue[0];
  console.log(`Next topic #${t.num}: ${t.title}`);
  console.log(`Primary keyword: ${t.keyword} | Category: ${t.category} | Audience: ${t.audience}`);
  console.log(`Topics left in queue: ${queue.length}${queue.length < 6 ? " (LOW: append a few new rows after publishing)" : ""}`);
  console.log(`Existing slugs (do not duplicate): ${existing.join(", ")}\n`);
  console.log(DRAFT_FORMAT);
}

function parseDraft(src) {
  const m = src.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) fail(["Draft must start with a --- front matter block ---"]);
  const fm = {};
  for (const line of m[1].split("\n")) {
    const i = line.indexOf(":");
    if (i > 0) fm[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }

  const blocks = [];
  let para = [];
  let list = null;
  const counts = {};
  const push = (type, data) => {
    counts[type] = (counts[type] ?? 0) + 1;
    const prefix = { heading: "h", paragraph: "p", list: "list", quote: "quote" }[type];
    blocks.push({ id: `${prefix}-${counts[type]}`, blockType: type, ...data });
  };
  const flush = () => {
    if (para.length) push("paragraph", { content: para.join(" ") });
    if (list) push("list", { items: list });
    para = [];
    list = null;
  };

  for (const raw of m[2].split("\n")) {
    const line = raw.trim();
    if (!line) { flush(); continue; }
    let mm;
    if ((mm = line.match(/^#{1,4}\s+(.*)$/))) { flush(); push("heading", { content: mm[1] }); }
    else if ((mm = line.match(/^[-*]\s+(.*)$/))) { if (para.length) flush(); (list ??= []).push(mm[1]); }
    else if ((mm = line.match(/^>\s?(.*)$/))) { flush(); push("quote", { content: mm[1] }); }
    else { if (list) flush(); para.push(line); }
  }
  flush();
  return { fm, blocks };
}

function cmdPublish(draftPath) {
  if (!draftPath) fail(["Usage: node scripts/blog.mjs publish <draft.md>"]);
  const { fm, blocks } = parseDraft(fs.readFileSync(draftPath, "utf8"));
  const errors = [];
  const warnings = [];

  const slug = fm.slug ?? "";
  const title = fm.title ?? "";
  const description = fm.description ?? "";
  const category = fm.category ?? "";
  let tags = (fm.tags ?? "").split(",").map((t) => t.trim()).filter(Boolean);
  tags = [...new Set(tags.filter((t) => t.toLowerCase() !== "contcave")), "ContCave"];

  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) errors.push(`slug "${slug}" must be kebab-case`);
  if (fs.existsSync(path.join(POSTS_DIR, `${slug}.json`))) errors.push(`content/posts/${slug}.json already exists`);
  if (!title || title.length > 65) errors.push(`title must be 1-65 chars (is ${title.length})`);
  if (description.length < 120 || description.length > 170) errors.push(`description should be 140-155 chars (is ${description.length})`);
  else if (description.length < 140 || description.length > 155) warnings.push(`description is ${description.length} chars (target 140-155)`);
  if (!fm.summary) errors.push("summary is required");
  if (!CATEGORIES[category]) errors.push(`category "${category}" is not one of: ${Object.keys(CATEGORIES).join(", ")}`);
  if (tags.length < 20 || tags.length > 30) errors.push(`need 20-30 tags including ContCave (have ${tags.length})`);

  const headings = blocks.filter((b) => b.blockType === "heading");
  if (headings[0] !== blocks[0]) errors.push("draft body must start with a # H1 heading");
  if (!blocks.some((b) => b.blockType === "quote")) errors.push("add at least one > quote");
  if (!headings.some((b) => /^FAQs?\b/i.test(b.content))) errors.push('missing "FAQs: <topic>" section');
  if (!headings.some((b) => /contcave/i.test(b.content))) errors.push('missing "Why book with ContCave" section');
  if (/\]\(|!\[|\*\*|<[a-z]/i.test(JSON.stringify(blocks))) errors.push("remove Markdown links, images, bold or HTML (renderer is plain text)");

  const words = blocks
    .flatMap((b) => (b.items ?? [b.content ?? ""]))
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;
  if (words < 1000 || words > 2100) errors.push(`word count ${words} is far outside 1,200-1,800`);
  else if (words < 1200 || words > 1800) warnings.push(`word count ${words} (target 1,200-1,800)`);

  if (errors.length) fail(errors);

  const today = new Date().toISOString().slice(0, 10);
  const stamp = `${today}T04:00:00Z`;
  const post = {
    id: slug,
    title,
    categories: [
      {
        id: category,
        title: CATEGORIES[category],
        breadcrumbs: [
          { doc: "home", label: "Home", id: "bc-home" },
          { doc: "blogs", label: "Blogs", id: "bc-blogs" },
          { doc: "category", label: CATEGORIES[category], id: `bc-${category}` },
        ],
        createdAt: `${today}T00:00:00Z`,
        updatedAt: `${today}T00:00:00Z`,
      },
    ],
    publishedAt: stamp,
    authors: ["ContCave Editorial"],
    hero: { type: "text", richText: [{ children: [{ text: fm.summary }] }], links: [] },
    layout: blocks,
    slug,
    meta: { title, description },
    _status: "published",
    createdAt: stamp,
    updatedAt: stamp,
    enablePremiumContent: false,
    populatedAuthors: [{ id: "author-cc-edit", name: "ContCave Editorial" }],
    premiumContent: [],
    tags,
  };
  fs.writeFileSync(path.join(POSTS_DIR, `${slug}.json`), JSON.stringify(post, null, 2) + "\n");

  // Move the topic from Queue to Published in the backlog.
  const topicNum = Number(fm.topic);
  const row = readQueue().find((t) => t.num === topicNum);
  if (row) {
    let backlog = fs.readFileSync(BACKLOG, "utf8").replace(row.line + "\n", "");
    backlog = backlog.trimEnd() + `\n| ${today} | ${topicNum} | ${slug} |\n`;
    fs.writeFileSync(BACKLOG, backlog);
  } else {
    warnings.push(`topic #${fm.topic} not found in Queue; backlog not updated`);
  }

  for (const w of warnings) console.log(`! ${w}`);
  console.log(`✓ content/posts/${slug}.json (${words} words, ${tags.length} tags, ${blocks.length} blocks)`);
  console.log(`Commit message: blog: ${title}`);
}

const [cmd, arg] = process.argv.slice(2);
if (cmd === "next") cmdNext();
else if (cmd === "publish") cmdPublish(arg);
else fail(["Usage: node scripts/blog.mjs next | publish <draft.md>"]);
