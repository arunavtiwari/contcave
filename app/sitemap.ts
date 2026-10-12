import { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/seo";

export const revalidate = 3600;

const latest = (dates: Date[]) =>
  dates.length ? new Date(Math.max(...dates.map((date) => date.getTime()))) : undefined;

const logError = (part: string, error: unknown) =>
  console.error(`[Sitemap] Error generating ${part}:`, error instanceof Error ? error.message : "Unknown error");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const cityRoutes: MetadataRoute.Sitemap = [];
  const postRoutes: MetadataRoute.Sitemap = [];

  let listingsModified: Date | undefined;
  try {
    const { latestListingUpdate } = await import("@/lib/listing/sitemap");
    listingsModified = await latestListingUpdate();
  } catch (error) {
    logError("listing freshness", error);
  }

  try {
    const [{ getPlaceDirectory, publishedCategories }, { cityCategoryPath, cityPath }] = await Promise.all([
      import("@/lib/listing/cities"),
      import("@/lib/listing/cityPaths"),
    ]);
    for (const city of await getPlaceDirectory()) {
      cityRoutes.push({
        url: absoluteUrl(cityPath(city.city)),
        lastModified: new Date(city.lastModified),
        changeFrequency: "daily",
        priority: 0.8,
      });
      for (const category of publishedCategories(city)) {
        cityRoutes.push({
          url: absoluteUrl(cityCategoryPath(city.city, category)),
          lastModified: new Date(city.lastModified),
          changeFrequency: "daily",
          priority: 0.8,
        });
      }
    }
  } catch (error) {
    logError("city routes", error);
  }

  try {
    const { getSortedPostsData } = await import("@/lib/posts");
    for (const post of getSortedPostsData()) {
      const modified = post.updatedAt ?? post.publishedAt;
      postRoutes.push({
        url: absoluteUrl(`/blog/${post.id}`),
        lastModified: modified ? new Date(modified) : undefined,
        changeFrequency: "monthly",
        priority: 0.7,
      });
    }
  } catch (error) {
    logError("blog routes", error);
  }

  const postsModified = latest(
    postRoutes.map((route) => route.lastModified).filter((date): date is Date => date instanceof Date)
  );

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified: listingsModified, changeFrequency: "daily", priority: 1.0 },
    { url: absoluteUrl("/studios"), lastModified: listingsModified, changeFrequency: "daily", priority: 0.9 },
    { url: absoluteUrl("/blog"), lastModified: postsModified, changeFrequency: "weekly", priority: 0.8 },
    { url: absoluteUrl("/about"), changeFrequency: "monthly", priority: 0.7 },
    { url: absoluteUrl("/cancellation"), changeFrequency: "monthly", priority: 0.5 },
    { url: absoluteUrl("/privacy-policy"), changeFrequency: "yearly", priority: 0.3 },
    { url: absoluteUrl("/terms-and-conditions"), changeFrequency: "yearly", priority: 0.3 },
  ];

  return [...staticRoutes, ...cityRoutes, ...postRoutes];
}
