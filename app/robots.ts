import { MetadataRoute } from "next";

const PRIVATE_PATHS = [
  "/api/",
  "/admin",
  "/dashboard",
  "/properties",
  "/properties/",
  "/properties/*",
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

export default function robots(): MetadataRoute.Robots {
  const base = "https://contcave.com";
  return {
    rules: [
      { userAgent: "*", allow: ["/"], disallow: PRIVATE_PATHS },
      { userAgent: NAMED_CRAWLERS, allow: ["/"], disallow: PRIVATE_PATHS },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
