import { PrismaClient } from "@prisma/client";
import { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://contcave.com";

  const routes: MetadataRoute.Sitemap = [
    { path: "", priority: 1.0, changeFrequency: "daily" as const },
    { path: "/home", priority: 0.9, changeFrequency: "daily" as const },
    { path: "/about", priority: 0.7, changeFrequency: "monthly" as const },
    { path: "/blog", priority: 0.8, changeFrequency: "weekly" as const },
    { path: "/privacy-policy", priority: 0.3, changeFrequency: "yearly" as const },
    { path: "/terms-and-conditions", priority: 0.3, changeFrequency: "yearly" as const },
    { path: "/cancellation", priority: 0.5, changeFrequency: "monthly" as const },
  ].map(({ path, priority, changeFrequency }) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
  }));

  try {
    const prisma = (await import("@/lib/prismadb")).default as PrismaClient;
    const listings = await prisma.listing.findMany({
      where: {
        status: "VERIFIED",
        active: true
      },
      select: { id: true, createdAt: true },
      take: 5000,
    });

    for (const listing of listings) {
      const slugOrId = listing.slug ?? listing.id;

      routes.push({
        url: `${base}/listings/${slugOrId}`,
        lastModified: listing.createdAt ?? new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.9,
      });
    }

    const { getSortedPostsData } = await import("@/lib/posts");
    const posts = getSortedPostsData();

    for (const post of posts) {
      routes.push({
        url: `${base}/blog/${post.id}`,
        lastModified: post.updatedAt ? new Date(post.updatedAt) : new Date(post.publishedAt ?? Date.now()),
        changeFrequency: "monthly" as const,
        priority: 0.7,
      });
    }
  } catch (error) {
    console.error('[Sitemap] Error generating dynamic routes:', error instanceof Error ? error.message : 'Unknown error');
  }

  return routes;
}
