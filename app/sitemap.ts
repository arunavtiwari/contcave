import { PrismaClient } from "@prisma/client";
import { MetadataRoute } from "next";

export const revalidate = 3600;

const base = "https://contcave.com";

const latest = (dates: Date[]) =>
  dates.length ? new Date(Math.max(...dates.map((date) => date.getTime()))) : undefined;

const logError = (part: string, error: unknown) =>
  console.error(`[Sitemap] Error generating ${part}:`, error instanceof Error ? error.message : "Unknown error");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const listingRoutes: MetadataRoute.Sitemap = [];
  const cityRoutes: MetadataRoute.Sitemap = [];
  const postRoutes: MetadataRoute.Sitemap = [];

  try {
    const prisma = (await import("@/lib/prismadb")).default as PrismaClient;
    const listings = await prisma.listing.findMany({
      where: {
        status: "VERIFIED",
        active: true,
        OR: [{ archivedAt: null }, { archivedAt: { isSet: false } }],
      },
      select: { id: true, createdAt: true, updatedAt: true, slug: true },
      take: 5000,
    });

    for (const listing of listings) {
      listingRoutes.push({
        url: `${base}/listings/${listing.slug ?? listing.id}`,
        lastModified: listing.updatedAt ?? listing.createdAt,
        changeFrequency: "weekly",
        priority: 0.9,
      });
    }
  } catch (error) {
    logError("listing routes", error);
  }

  try {
    const { cityPath, getCityDirectory } = await import("@/lib/listing/cities");
    for (const city of await getCityDirectory()) {
      cityRoutes.push({
        url: `${base}${cityPath(city.city)}`,
        lastModified: new Date(city.lastModified),
        changeFrequency: "daily",
        priority: 0.8,
      });
    }
  } catch (error) {
    logError("city routes", error);
  }

  try {
    const { getSortedPostsData } = await import("@/lib/posts");
    for (const post of getSortedPostsData()) {
      const modified = post.updatedAt ?? post.publishedAt;
      postRoutes.push({
        url: `${base}/blog/${post.id}`,
        lastModified: modified ? new Date(modified) : undefined,
        changeFrequency: "monthly",
        priority: 0.7,
      });
    }
  } catch (error) {
    logError("blog routes", error);
  }

  const listingsModified = latest(
    listingRoutes.map((route) => route.lastModified).filter((date): date is Date => date instanceof Date)
  );
  const postsModified = latest(
    postRoutes.map((route) => route.lastModified).filter((date): date is Date => date instanceof Date)
  );

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, lastModified: listingsModified, changeFrequency: "daily", priority: 1.0 },
    { url: `${base}/home`, lastModified: listingsModified, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/studios`, lastModified: listingsModified, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/blog`, lastModified: postsModified, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/cancellation`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/privacy-policy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/terms-and-conditions`, changeFrequency: "yearly", priority: 0.3 },
  ];

  return [...staticRoutes, ...cityRoutes, ...listingRoutes, ...postRoutes];
}
