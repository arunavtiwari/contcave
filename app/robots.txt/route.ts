import { type NextRequest } from "next/server";

import { isAdminDomainHost } from "@/lib/http/adminHost";
import { listingSitemapCount, listingSitemapPath } from "@/lib/listing/sitemap";
import { SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";

const PRIVATE_PATHS = [
  "/api/",
  "/admin",
  "/dashboard",
  "/properties",
  "/bookings",
  "/favorites",
  "/reservations",
  "/profile",
  "/profile-transaction",
  "/chat/",
  "/payments/",
  "/demo/",
];

const NAMED_CRAWLERS = [
  "Googlebot",
  "Bingbot",
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-User",
  "Claude-SearchBot",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
];

const CONTENT_SIGNAL = "Content-Signal: search=yes, ai-input=yes, ai-train=no";

const rules = (agents: string[], extra: string[] = []) =>
  [
    ...agents.map((agent) => `User-agent: ${agent}`),
    ...extra,
    "Allow: /",
    ...PRIVATE_PATHS.map((path) => `Disallow: ${path}`),
  ].join("\n");

async function publicRobots() {
  const count = await listingSitemapCount().catch(() => 1);
  const sitemaps = [
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    ...Array.from({ length: count }, (_, id) => `Sitemap: ${SITE_URL}${listingSitemapPath(id)}`),
  ];
  return [
    rules(["*"], [CONTENT_SIGNAL]),
    rules(NAMED_CRAWLERS, [CONTENT_SIGNAL]),
    sitemaps.join("\n"),
  ].join("\n\n") + "\n";
}

const ADMIN_ROBOTS = "User-agent: *\nDisallow: /\n";

export async function GET(request: NextRequest) {
  const host = request.headers.get("host") ?? request.nextUrl.host;
  return new Response(isAdminDomainHost(host) ? ADMIN_ROBOTS : await publicRobots(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600",
    },
  });
}
