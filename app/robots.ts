import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = "https://contcave.com";
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        disallow: [
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
          "/Profile",
          "/profile-transaction",
          "/chat/",
          "/payments/",
          "/demo/",
        ],
      },
      {
        userAgent: "Googlebot",
        allow: ["/"],
        disallow: [
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
          "/Profile",
          "/profile-transaction",
          "/chat/",
          "/payments/",
          "/demo/",
        ],
      },
      {
        userAgent: "GPTBot",
        allow: ["/"],
        disallow: ["/api/", "/admin", "/dashboard", "/profile", "/Profile", "/chat/", "/payments/"],
      },
      {
        userAgent: "ChatGPT-User",
        allow: ["/"],
        disallow: ["/api/", "/admin", "/dashboard", "/profile", "/Profile", "/chat/", "/payments/"],
      },
      {
        userAgent: "CCBot",
        allow: ["/"],
        disallow: ["/api/", "/admin", "/dashboard", "/profile", "/Profile", "/chat/", "/payments/"],
      },
      {
        userAgent: "anthropic-ai",
        allow: ["/"],
        disallow: ["/api/", "/admin", "/dashboard", "/profile", "/Profile", "/chat/", "/payments/"],
      },
      {
        userAgent: "Claude-Web",
        allow: ["/"],
        disallow: ["/api/", "/admin", "/dashboard", "/profile", "/Profile", "/chat/", "/payments/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
