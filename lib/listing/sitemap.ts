import "server-only";

import prisma from "@/lib/prismadb";

const LISTINGS_PER_SITEMAP = 10_000;

const PUBLIC_LISTING_WHERE = {
  status: "VERIFIED" as const,
  active: true,
  OR: [{ archivedAt: null }, { archivedAt: { isSet: false } }],
};

export async function listingSitemapCount() {
  const total = await prisma.listing.count({ where: PUBLIC_LISTING_WHERE });
  return Math.max(1, Math.ceil(total / LISTINGS_PER_SITEMAP));
}

export const listingSitemapPath = (id: number) => `/studio/sitemap/${id}.xml`;

export function listingSitemapPage(id: number) {
  return prisma.listing.findMany({
    where: PUBLIC_LISTING_WHERE,
    select: { id: true, createdAt: true, updatedAt: true, slug: true },
    orderBy: { createdAt: "asc" },
    skip: id * LISTINGS_PER_SITEMAP,
    take: LISTINGS_PER_SITEMAP,
  });
}

export async function latestListingUpdate() {
  const latest = await prisma.listing.findFirst({
    where: PUBLIC_LISTING_WHERE,
    select: { updatedAt: true, createdAt: true },
    orderBy: { updatedAt: "desc" },
  });
  return latest ? latest.updatedAt ?? latest.createdAt : undefined;
}
