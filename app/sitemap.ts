import { MetadataRoute } from "next";
import { PrismaClient } from "@prisma/client";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://contcave.com";

  const routes: MetadataRoute.Sitemap = [
    "",
    "/home",
    "/about",
    "/blog",
    "/privacy-policy",
    "/terms-and-conditions",
    "/cancellation",
  ].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.8,
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
      routes.push({
        url: `${base}/listings/${listing.id}`,
        lastModified: listing.createdAt ?? new Date(),
        changeFrequency: "weekly",
        priority: 0.9,
      });
    }

    const { getSortedPostsData } = await import("@/lib/posts");
    const posts = getSortedPostsData();

    for (const post of posts) {
      routes.push({
        url: `${base}/blog/${post.id}`,
        lastModified: post.updatedAt ? new Date(post.updatedAt) : new Date(post.publishedAt ?? Date.now()),
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
  } catch (error) {
    console.error('[Sitemap] Error generating dynamic routes:', error instanceof Error ? error.message : 'Unknown error');
  }

  return routes;
}
