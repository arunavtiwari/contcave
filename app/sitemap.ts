import { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://contcave.com";

  const routes = [
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
    const prisma = (await import("@/lib/prismadb")).default as any;
    const listings = await prisma?.listing?.findMany?.({
      where: { isPublished: true as any },
      select: { id: true, updatedAt: true },
      take: 5000,
    });
    if (Array.isArray(listings)) {
      for (const l of listings) {
        // Only include public listing URLs. Exclude private property dashboard/detail.
        routes.push({
          url: `${base}/listings/${l.id}`,
          lastModified: l.updatedAt ?? new Date(),
          changeFrequency: "weekly",
          priority: 0.9,
        } as any);
      }
    }

    const { getSortedPostsData } = await import("@/lib/posts");
    const posts = getSortedPostsData();
    for (const post of posts) {
      routes.push({
        url: `${base}/blog/${post.id}`,
        lastModified: post.updatedAt ? new Date(post.updatedAt) : new Date(post.publishedAt ?? Date.now()),
        changeFrequency: "monthly",
        priority: 0.6,
      } as any);
    }
  } catch {}

  return routes;
}
