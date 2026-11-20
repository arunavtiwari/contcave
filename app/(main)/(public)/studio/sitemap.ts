import type { MetadataRoute } from "next";

import { listingPath } from "@/lib/listing/seo";
import { listingSitemapCount, listingSitemapPage } from "@/lib/listing/sitemap";
import { SITE_URL } from "@/lib/seo";

export const revalidate = 3600;

export async function generateSitemaps() {
  const count = await listingSitemapCount().catch(() => 1);
  return Array.from({ length: count }, (_, id) => ({ id }));
}

export default async function sitemap(props: { id: Promise<string> }): Promise<MetadataRoute.Sitemap> {
  const id = Number(await props.id);
  if (!Number.isInteger(id) || id < 0) return [];

  try {
    const listings = await listingSitemapPage(id);
    return listings.map((listing) => ({
      url: `${SITE_URL}${listingPath(listing)}`,
      lastModified: listing.updatedAt ?? listing.createdAt,
      changeFrequency: "weekly",
      priority: 0.9,
    }));
  } catch (error) {
    console.error("[Sitemap] Error generating studio sitemap:", error instanceof Error ? error.message : "Unknown error");
    return [];
  }
}
