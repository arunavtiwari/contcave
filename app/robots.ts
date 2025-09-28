import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = "https://www.contcave.com";
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
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
